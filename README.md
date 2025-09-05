# JB Buddy Price Finder Chrome Extension

A Chrome extension that helps you find better prices for JB Hi-Fi products by automatically detecting model numbers and providing a quick link to search on JB Buddy.

## Features

- Automatically detects product model numbers on JB Hi-Fi product pages
- Shows a speech bubble popup above the model number
- Click the popup to search for the product on JB Buddy in a new tab
- Works seamlessly with JB Hi-Fi's website navigation

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension folder
5. The extension will now be active on JB Hi-Fi pages

## How it works

1. When you visit a JB Hi-Fi product page, the extension looks for the model number in the element with ID `pdp-title-model`
2. If a model is found, a small speech bubble popup appears above it saying "Search on JB Buddy"
3. Clicking the popup opens a new tab with the JB Buddy search URL for that specific model
4. The popup is positioned as a speech bubble pointing down to the model element

## Files

- `manifest.json` - Extension configuration
- `content.js` - Main script that detects models and creates popups
- `popup.css` - Styling for the speech bubble popup
- `README.md` - This file

## Example

When viewing a product like the Samsung 65" S90F OLED TV (model: QA65S90FAEXXY), the extension will:
1. Detect the model number from the page
2. Show a popup above the model element
3. When clicked, open: `https://www.jbbuddy.com/?q=QA65S90FAEXXY`

<img src="example.png" alt="Example of the extension in action" width="400">

*The white speech bubble "Search on JB Buddy" appears above the product title, allowing users to quickly search for better prices on JB Buddy.*

## Notes

- The extension only works on `https://www.jbhifi.com.au/` pages
- It requires no special permissions beyond accessing the current tab
- The popup is designed to be unobtrusive and only appears when a model is detected
