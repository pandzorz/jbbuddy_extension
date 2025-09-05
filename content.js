// Content script for JB Buddy Price Finder extension
(function() {
    'use strict';
    
    // Clean up any existing scroll handlers from previous runs
    const existingPopups = document.querySelectorAll('.jb-buddy-popup');
    existingPopups.forEach(popup => {
        if (popup._scrollHandler) {
            window.removeEventListener('scroll', popup._scrollHandler);
        }
        if (popup._resizeHandler) {
            window.removeEventListener('resize', popup._resizeHandler);
        }
        if (popup._animationFrame) {
            cancelAnimationFrame(popup._animationFrame);
        }
        if (popup._repositionTimeout) {
            clearTimeout(popup._repositionTimeout);
        }
        popup.remove();
    });

    // Function to extract model number from the element
    function extractModelNumber(element) {
        const text = element.textContent || element.innerText;
        const match = text.match(/MODEL:\s*([A-Z0-9\/\-]+)/i);
        return match ? match[1] : null;
    }

    // Function to extract product name from the page
    function extractProductName() {
        // Try to find the product title in various common selectors
        const selectors = [
            'h1[data-testid="pdp-title"]',
            'h1.pdp-title',
            '.pdp-title',
            'h1',
            '.product-title',
            '[data-testid="product-title"]'
        ];
        
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                let text = element.textContent || element.innerText;
                // Clean up the text - remove extra whitespace and common prefixes
                text = text.trim().replace(/^Samsung\s+/i, '').replace(/^LG\s+/i, '').replace(/^Sony\s+/i, '');
                // Limit length for display
                if (text.length > 30) {
                    text = text.substring(0, 27) + '...';
                }
                return text;
            }
        }
        
        return 'Product';
    }

    // Function to create the popup element
    function createPopup(modelNumber) {
        const popup = document.createElement('div');
        popup.className = 'jb-buddy-popup';
        popup.innerHTML = `
            <div class="jb-buddy-popup-content">
                <span class="jb-buddy-popup-text">Search on JB Buddy</span>
                <div class="jb-buddy-popup-arrow"></div>
            </div>
        `;
        
        // Add click event to open JB Buddy
        popup.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const url = `https://www.jbbuddy.com/?q=${encodeURIComponent(modelNumber)}`;
            window.open(url, '_blank');
        });

        return popup;
    }

    // Function to position the popup to the right of the price element
    function positionPopup(popup, targetElement) {
        // Try to find the price element first
        const priceSelectors = [
            // JB Hi-Fi specific selectors
            '#pdp-price-tag-wrapper',
            '#pdp-price-cta',
            '.PriceTag_card__1eb7mu90',
            '.PriceTag_priceTag__1eb7mu92o',
            '.PriceTag_actualWrapperDefault__1eb7mu919',
            // Generic selectors
            '.price',
            '.product-price',
            '[data-testid="price"]',
            '.price-current',
            '.price-now',
            '.pricing',
            '.price-box',
            '.price-container',
            '.deal-price',
            '.sale-price',
            '.price-display',
            '[class*="price"]',
            '[id*="price"]'
        ];
        
        let priceElement = null;
        
        // First try the specific selectors
        for (const selector of priceSelectors) {
            priceElement = document.querySelector(selector);
            if (priceElement) {
                break;
            }
        }
        
        // If no price element found, search for elements containing dollar signs
        if (!priceElement) {
            const allElements = document.querySelectorAll('*');
            for (const element of allElements) {
                const text = element.textContent || element.innerText;
                if (text && text.includes('$') && text.match(/\$\d+/)) {
                    // Check if this looks like a price (contains $ followed by digits)
                    // Also check if it's not too small (avoid tiny price elements)
                    const rect = element.getBoundingClientRect();
                    if (rect.width > 50 && rect.height > 20) {
                        // Additional check: make sure it's not hidden or has very small text
                        const computedStyle = window.getComputedStyle(element);
                        if (computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden') {
                            priceElement = element;
                            break;
                        }
                    }
                }
            }
        }
        
        // Always use model element as fallback if no price found
        const referenceElement = priceElement || targetElement;
        const rect = referenceElement.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        popup.style.position = 'absolute';
        popup.style.zIndex = '100';
        
        if (priceElement) {
            // Try to find the actual price text element within the price box for better centering
            let priceTextElement = priceElement.querySelector('.PriceTag_actualWrapperDefault__1eb7mu919') || 
                                 priceElement.querySelector('.PriceTag_actual__1eb7mu91a') ||
                                 priceElement.querySelector('.PriceTag_priceTag__1eb7mu92o');
            
            
            // If still not found, search for elements containing the dollar sign
            if (!priceTextElement) {
                const allElements = priceElement.querySelectorAll('*');
                for (const element of allElements) {
                    const text = element.textContent || element.innerText;
                    if (text && text.includes('$') && text.match(/\$\d+/)) {
                        priceTextElement = element;
                        break;
                    }
                }
            }
            
            // Fallback to the price element if no text element found
            if (!priceTextElement) {
                priceTextElement = priceElement;
            }
            
            // Keep popup in document body, not as child of price element
            document.body.appendChild(popup);
            
            // Store the price element reference on the popup for the scroll handler
            popup._priceElement = priceElement;
            
            // Set initial styles but don't position yet - let scroll handler do it
            popup.style.position = 'absolute';
            popup.style.transform = 'translateY(-50%)';
            popup.style.opacity = '0';
            popup.style.visibility = 'hidden';
            
        } else {
            // Fallback to above model element
            popup.style.top = (rect.top + scrollTop - 100) + 'px';
            popup.style.left = (rect.left + scrollLeft + rect.width / 2) + 'px';
            popup.style.transform = 'translateX(-50%)';
        }
    }

    // Function to find and process model elements
    function processModelElements() {
        // Look for the specific model element
        const modelElement = document.querySelector('#pdp-title-model');
        
        if (modelElement) {
            const modelNumber = extractModelNumber(modelElement);
            
            if (modelNumber) {
                // Check if popup already exists
                const existingPopup = document.querySelector('.jb-buddy-popup');
                if (existingPopup) {
                    existingPopup.remove();
                }
                
                // Create and show popup
                const popup = createPopup(modelNumber);
                document.body.appendChild(popup);
                positionPopup(popup, modelElement);
                
                // Show popup initially and keep it visible
                popup.style.opacity = '1';
                popup.style.visibility = 'visible';
                
                // Clean up any existing scroll handlers first
                if (popup._scrollHandler) {
                    window.removeEventListener('scroll', popup._scrollHandler);
                }
                
                // Only add scroll listener if we have a price element (not fallback to model element)
                if (popup._priceElement) {
                    // Add scroll listener to hide popup when price box becomes sticky
                    let lastScrollTop = 0;
                    const handleScroll = () => {
                        const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
                        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
                        
                        // Use the stored price element reference first (for initial positioning)
                        let currentPriceElement = popup._priceElement;
                        
                        // If the stored element is no longer in the DOM, try to find the current one
                        if (!currentPriceElement || !document.contains(currentPriceElement)) {
                            currentPriceElement = document.querySelector('#pdp-price-tag-wrapper');
                        }
                        
                        // Only proceed if we have a price element
                        if (!currentPriceElement || !document.contains(currentPriceElement)) {
                            popup.style.opacity = '0';
                            popup.style.visibility = 'hidden';
                            return;
                        }
                        
                        const priceRect = currentPriceElement.getBoundingClientRect();
                        
                        // Check if the price element is in its original position (not sticky)
                        const isOriginalPosition = priceRect.top > 0 && !currentPriceElement.classList.contains('_1vzft5e6');
                        const hasStickyVariant = currentPriceElement.querySelector('.PriceTag_card_variant_small__1eb7mu92');
                        
                        
                        if (isOriginalPosition && !hasStickyVariant) {
                            // Price box is in original position, show and reposition popup
                            const absoluteTop = priceRect.top + currentScrollTop + (priceRect.height / 2);
                            const absoluteLeft = priceRect.right + scrollLeft + 10;
                            
                            popup.style.top = absoluteTop + 'px';
                            popup.style.left = absoluteLeft + 'px';
                            popup.style.opacity = '1';
                            popup.style.visibility = 'visible';
                            
                            // Update the stored reference
                            popup._priceElement = currentPriceElement;
                            
                        } else {
                            // Price box has become sticky, hide popup
                            popup.style.opacity = '0';
                            popup.style.visibility = 'hidden';
                        }
                        
                        lastScrollTop = currentScrollTop;
                    };
                    
                    // Add scroll listener
                    window.addEventListener('scroll', handleScroll, { passive: true });
                    
                    // Add resize listener to reposition popup when window is resized
                    const handleResize = () => {
                        handleScroll();
                    };
                    window.addEventListener('resize', handleResize, { passive: true });
                    
                    // Store the handlers for cleanup
                    popup._scrollHandler = handleScroll;
                    popup._resizeHandler = handleResize;
                    
                    // Trigger the scroll handler with a small delay to ensure page is settled
                    setTimeout(() => {
                        handleScroll();
                    }, 2000);
                    
                    // Track the last known position of the price element
                    let lastPriceRect = null;
                    
                    // Function to check if price element has moved and reposition if needed
                    const checkAndReposition = () => {
                        if (!popup._priceElement || !document.contains(popup._priceElement)) {
                            return;
                        }
                        
                        const currentRect = popup._priceElement.getBoundingClientRect();
                        
                        // Check if the position has changed significantly (more than 5px)
                        if (!lastPriceRect || 
                            Math.abs(currentRect.top - lastPriceRect.top) > 5 ||
                            Math.abs(currentRect.left - lastPriceRect.left) > 5) {
                            
                            lastPriceRect = currentRect;
                            handleScroll();
                        }
                        
                        // Continue checking
                        popup._animationFrame = requestAnimationFrame(checkAndReposition);
                    };
                    
                    // Start the position checking loop
                    popup._animationFrame = requestAnimationFrame(checkAndReposition);
                }
            }
        }
    }

    // Function to handle page changes (for SPA navigation)
    function handlePageChange() {
        // Remove existing popups
        const existingPopups = document.querySelectorAll('.jb-buddy-popup');
        existingPopups.forEach(popup => popup.remove());
        
        // Wait a bit for the page to load, then process
        setTimeout(processModelElements, 1000);
    }

    // Initial processing
    processModelElements();

    // Listen for page changes (useful for single-page applications)
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            handlePageChange();
        }
    }).observe(document, { subtree: true, childList: true });

    // Also process when DOM content is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', processModelElements);
    }
})();
