// Content script for JB Buddy Price Finder extension
(function() {
    'use strict';

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
                console.log('Found price element with selector:', selector, priceElement);
                break;
            }
        }
        
        // If no price element found, search for elements containing dollar signs
        if (!priceElement) {
            console.log('No price element found with selectors, searching for dollar signs...');
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
                            console.log('Found price element by dollar sign search:', element, text.trim());
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
            
            console.log('Price text element found with selectors:', priceTextElement);
            
            // If still not found, search for elements containing the dollar sign
            if (!priceTextElement) {
                console.log('Price text element not found with selectors, searching within price element...');
                const allElements = priceElement.querySelectorAll('*');
                for (const element of allElements) {
                    const text = element.textContent || element.innerText;
                    if (text && text.includes('$') && text.match(/\$\d+/)) {
                        priceTextElement = element;
                        console.log('Found price text element:', element, text.trim());
                        break;
                    }
                }
            }
            
            // Fallback to the price element if no text element found
            if (!priceTextElement) {
                priceTextElement = priceElement;
            }
            
            // Position the popup relative to the price element
            const priceTextRect = priceTextElement.getBoundingClientRect();
            const priceRect = priceElement.getBoundingClientRect();
            
            // Calculate position relative to the price element - center with the entire price box
            const relativeTop = priceRect.height / 2; // Center with the entire price box
            const relativeLeft = priceRect.width + 10; // 10px gap from right edge
            
            popup.style.position = 'absolute';
            popup.style.top = relativeTop + 'px';
            popup.style.left = relativeLeft + 'px';
            popup.style.transform = 'translateY(-50%)';
            
            // Make the price element the positioning parent
            priceElement.style.position = 'relative';
            priceElement.appendChild(popup);
            
            console.log('Positioning popup relative to price element:', {
                priceTextRect: priceTextRect,
                priceRect: priceRect,
                relativeTop: relativeTop,
                relativeLeft: relativeLeft
            });
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
