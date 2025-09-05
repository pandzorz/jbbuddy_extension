// Content script for JB Buddy Price Finder extension
(function() {
    'use strict';

    // Function to extract model number from the element
    function extractModelNumber(element) {
        const text = element.textContent || element.innerText;
        const match = text.match(/MODEL:\s*([A-Z0-9\/]+)/i);
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

    // Function to position the popup above the model element
    function positionPopup(popup, targetElement) {
        const rect = targetElement.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        popup.style.position = 'absolute';
        popup.style.top = (rect.top + scrollTop - 100) + 'px'; // Much larger distance above
        popup.style.left = (rect.left + scrollLeft + rect.width / 2) + 'px';
        popup.style.transform = 'translateX(-50%)';
        popup.style.zIndex = '100'; // Lower z-index to appear below fixed navigation bars
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
                
                // Add hover effects
                modelElement.addEventListener('mouseenter', function() {
                    popup.style.opacity = '1';
                    popup.style.visibility = 'visible';
                });
                
                modelElement.addEventListener('mouseleave', function() {
                    popup.style.opacity = '0';
                    popup.style.visibility = 'hidden';
                });
                
                // Show popup initially
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
