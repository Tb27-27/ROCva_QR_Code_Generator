document.addEventListener('DOMContentLoaded', () => {
    const qrInput = document.getElementById('qr-input');
    const qrPreview = document.getElementById('qr-preview');
    const downloadBtn = document.getElementById('download-btn');
    
    const appWrapper = document.getElementById('app-wrapper');
    const toggleColorBtn = document.getElementById('toggle-colors-btn');
    const toggleIconBtn = document.getElementById('toggle-icon-btn');
    const iconChoices = document.querySelectorAll('input[name="qr-icon"]');
    const colorDots = document.getElementById('color-dots');
    const colorBoxes = document.getElementById('color-boxes');
    const colorBg = document.getElementById('color-bg');
    let currentSvgString = "";
    
    let base64Logo = "";

    function loadLogo(source) {
        const logo = new Image();
        logo.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = logo.width;
        canvas.height = logo.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(logo, 0, 0);
        base64Logo = canvas.toDataURL('image/png');
        generateQRCode();
        };

        logo.onerror = () => {
            console.error(`Failed to load ${source}`);
            base64Logo = "";
            generateQRCode();
        };

        logo.src = source;
    }

    loadLogo(document.querySelector('input[name="qr-icon"]:checked').value);

    qrInput.addEventListener('input', generateQRCode);
    
    // Toggle panels
    toggleColorBtn.addEventListener('click', () => {
        const isOpen = appWrapper.classList.toggle('show-colors');
        appWrapper.classList.remove('show-icons');
        toggleColorBtn.setAttribute('aria-expanded', String(isOpen));
        toggleIconBtn.setAttribute('aria-expanded', 'false');
    });
    
    toggleIconBtn.addEventListener('click', () => {
        const isOpen = appWrapper.classList.toggle('show-icons');
        appWrapper.classList.remove('show-colors');
        toggleIconBtn.setAttribute('aria-expanded', String(isOpen));
        toggleColorBtn.setAttribute('aria-expanded', 'false');
    });

    iconChoices.forEach((choice) => {
        choice.addEventListener('change', () => {
            if (!choice.checked) return;

            if (choice.value === 'Logo_ROCvA.svg') {
                colorDots.value = '#333333';
                colorBoxes.value = '#ff0028';
                colorBg.value = '#ffffff';
            } else {
                colorDots.value = '#000000';
                colorBoxes.value = '#f47933';
                colorBg.value = '#ffffff';
            }

            loadLogo(choice.value);
        });
    });

    // Re-generate QR when colors change
    colorDots.addEventListener('input', generateQRCode);
    colorBoxes.addEventListener('input', generateQRCode);
    colorBg.addEventListener('input', generateQRCode);
    
    if (qrInput.value.trim() !== '') {
        generateQRCode();
    }

    function generateQRCode() {
        let text = qrInput.value.trim();
        if (!text) {
            qrPreview.innerHTML = "";
            currentSvgString = "";
            return;
        }

        // --- FIX FOR LONG LINKS ---
        text = text.replace(/\s+/g, '');
        if (!/^https?:\/\//i.test(text) && !/^intent:\/\//i.test(text) && !/^mailto:/i.test(text) && !/^tel:/i.test(text)) {
            text = 'https://' + text;
        }

        // Get custom colors
        const dotColor = colorDots.value;
        const boxColor = colorBoxes.value;
        const bgColor = colorBg.value;

        try {
            // Get the raw QR code matrix data
            const qrData = QRCode.create(text, { errorCorrectionLevel: 'H' });
            const moduleCount = qrData.modules.size;
            const margin = 2; 
            const totalModules = moduleCount + (margin * 2);
            
            // Start building the SVG string
            let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalModules} ${totalModules}" shape-rendering="crispEdges">`;
            
            // Background
            svg += `<rect width="100%" height="100%" fill="${bgColor}"/>`;

            // Draw modules
            for (let row = 0; row < moduleCount; row++) {
                for (let col = 0; col < moduleCount; col++) {
                    if (qrData.modules.data[row * moduleCount + col]) {
                        
                        // Check if this module is part of the 3 corner finder patterns
                        const isTopLeft = (row < 7 && col < 7);
                        const isTopRight = (row < 7 && col >= moduleCount - 7);
                        const isBottomLeft = (row >= moduleCount - 7 && col < 7);
                        
                        let color = dotColor; // Default data dot color
                        if (isTopLeft || isTopRight || isBottomLeft) {
                            color = boxColor; // Finder pattern color
                        }

                        // Add the rectangle for the dot
                        svg += `<rect x="${col + margin}" y="${row + margin}" width="1" height="1" fill="${color}"/>`;
                    }
                }
            }

            // Draw Logo in the bottom right corner
            if (base64Logo) {
                // Dynamically reduce logo size if the text is very long
                let logoRatio = 0.20; 
                if (text.length > 150) {
                    logoRatio = 0.12; 
                } else if (text.length > 75) {
                    logoRatio = 0.15; 
                }
                
                const logoSize = totalModules * logoRatio;
                
                // Position in bottom right, with proportional padding
                const padding = (15 / 300) * totalModules; // scale padding relative to modules
                const x = totalModules - logoSize - padding;
                const y = totalModules - logoSize - padding;

                // Draw a background rectangle behind the logo (using the user's custom bg color)
                const bgPadding = (4 / 300) * totalModules;
                svg += `<rect x="${x - bgPadding}" y="${y - bgPadding}" width="${logoSize + (bgPadding * 2)}" height="${logoSize + (bgPadding * 2)}" fill="${bgColor}"/>`;

                // Embed the Base64 logo image directly into the SVG
                svg += `<image x="${x}" y="${y}" width="${logoSize}" height="${logoSize}" href="${base64Logo}"/>`;
            }

            svg += `</svg>`;
            
            // Update the preview and store for download
            qrPreview.innerHTML = svg;
            currentSvgString = svg;
            
        } catch (err) {
            console.error(err);
        }
    }

    const formatSelect = document.getElementById('download-format');

    // Handle SVG or PNG download
    downloadBtn.addEventListener('click', () => {
        if (!currentSvgString) {
            alert("Please enter text or a URL first to generate a QR Code.");
            return;
        }
        
        const format = formatSelect.value;
        
        if (format === 'svg') {
            // Download as SVG
            const blob = new Blob([currentSvgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.download = 'rocva-qrcode.svg';
            link.href = url;
            link.click();
            
            URL.revokeObjectURL(url);
        } else {
            // Download as PNG (Rasterize SVG to high-res canvas)
            const canvas = document.createElement('canvas');
            // 1024x1024 guarantees a crisp, high-quality PNG
            canvas.width = 1024;
            canvas.height = 1024;
            const ctx = canvas.getContext('2d');
            
            const img = new Image();
            const svgBlob = new Blob([currentSvgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
            
            img.onload = () => {
                // Ensure a solid white background in the PNG just in case
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                // Draw the perfectly scaled SVG vector image onto the canvas
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                URL.revokeObjectURL(url);
                
                const link = document.createElement('a');
                link.download = 'rocva-qrcode.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
            };
            
            img.src = url;
        }
    });
});
