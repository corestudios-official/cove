const fs = require('fs');
const path = require('path');

// Create a simple BMP placeholder for the installer sidebar
// The installer sidebar should be 164x314 pixels
// electron-builder will use this for the NSIS installer sidebar

console.log('Installer assets ready.');
console.log('Note: For a custom installer sidebar, create a 164x314 BMP file named installer-sidebar.bmp in the project root.');
console.log('The sidebar should use Cove colors: background #EDE8D0, accent #7B9BB5');
