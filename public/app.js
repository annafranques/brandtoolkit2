// Helper function to convert RGB to hex - Attached to window for global access
function rgbToHex(rgb) {
    if (!rgb) return '#ffffff';
    // Handle rgb(r, g, b) format
    const match = rgb.match(/\d+/g);
    if (!match || match.length < 3) return '#ffffff';
    const r = parseInt(match[0]);
    const g = parseInt(match[1]);
    const b = parseInt(match[2]);
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}
window.rgbToHex = rgbToHex;

// Helper function to check if data URL is a video
function isVideoDataUrl(dataUrl) {
    return dataUrl && typeof dataUrl === 'string' && dataUrl.startsWith('data:video/');
}

// Helper function to check if URL is a Vimeo link
function isVimeoUrl(url) {
    if (!url || typeof url !== 'string') return false;
    return /vimeo\.com/.test(url);
}

// Helper function to convert Vimeo URL to embed URL
function getVimeoEmbedUrl(url) {
    if (!isVimeoUrl(url)) return null;
    
    // Extract video ID from various Vimeo URL formats:
    // https://vimeo.com/123456789
    // https://vimeo.com/123456789?share=copy
    // https://player.vimeo.com/video/123456789
    let videoId = null;
    
    const playerMatch = url.match(/player\.vimeo\.com\/video\/(\d+)/);
    if (playerMatch) {
        videoId = playerMatch[1];
    } else {
        const standardMatch = url.match(/vimeo\.com\/(\d+)/);
        if (standardMatch) {
            videoId = standardMatch[1];
        }
    }
    
    if (!videoId) return null;
    
    return `https://player.vimeo.com/video/${videoId}?background=1&autoplay=1&loop=1&muted=1&controls=0`;
}

// Helper function to convert markdown bold (**text**) to HTML bold
function parseMarkdownBold(text) {
    if (!text) return '';
    // Convert **text** to <strong>text</strong>
    return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function getContrastColor(hexColor) {
    if (!hexColor) return '#000000';
    hexColor = hexColor.replace('#', '');
    const r = parseInt(hexColor.substr(0, 2), 16);
    const g = parseInt(hexColor.substr(2, 2), 16);
    const b = parseInt(hexColor.substr(4, 2), 16);
    
    // Calculate relative luminance (WCAG formula)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Use white text if background is dark, black if light
    return luminance > 0.5 ? '#000000' : '#ffffff';
}
window.getContrastColor = getContrastColor;

// Fetch and display brand content
async function loadContent() {
    try {
        const response = await fetch('/api/content');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const content = await response.json();
        
        // Debug: Log the entire content structure
        console.log('=== FULL CONTENT LOADED ===');
        console.log('Content structure:', content);
        console.log('Logotype:', content.logotype);
        if (content.logotype) {
            console.log('Logotype subsections:', content.logotype.subsections);
            if (content.logotype.subsections) {
                console.log('Subsections count:', content.logotype.subsections.length);
                content.logotype.subsections.forEach((sub, idx) => {
                    console.log(`Subsection ${idx}:`, { title: sub.title, hasContent: !!sub.content, contentLength: sub.content ? sub.content.length : 0, hasImage: !!sub.image, hasTabs: !!sub.hasTabs });
                });
            }
        }
        console.log('=== END CONTENT DEBUG ===');
        
        // Set brand name and update sidebar
        const brandName = content.brandName || 'The Name of the Project';
        const sidebarProjectName = document.getElementById('sidebar-project-name');
        if (sidebarProjectName) {
            sidebarProjectName.textContent = brandName;
        }
        
        // Get brand colors for section separations - use light secondary colors
        const brandColors = content.colors || [];
        const lightColors = brandColors
            .filter(c => c.type === 'secondary')
            .map(c => c.hex)
            .filter(hex => {
                // Filter to only include light colors (high brightness)
                if (!hex) return false;
                hex = hex.replace('#', '');
                const r = parseInt(hex.substr(0, 2), 16);
                const g = parseInt(hex.substr(2, 2), 16);
                const b = parseInt(hex.substr(4, 2), 16);
                // Calculate brightness (0-255)
                const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                return brightness > 150; // Only light colors
            });
        
        // Default light colors if none found
        const defaultLightColors = ['#ffffff', '#f5f5f5'];
        const sectionColors = lightColors.length > 0 ? lightColors : defaultLightColors;
        
        // Helper function to add hero image or video to a section
        function addSectionHero(section, heroMedia, sectionTitle) {
            if (!section || !heroMedia) return;
            
            const h2 = section.querySelector('h2');
            if (!h2) return;
            
            section.classList.add('has-hero');
            const existingHero = section.querySelector('.content-section-hero');
            if (!existingHero) {
                const heroDiv = document.createElement('div');
                heroDiv.className = 'content-section-hero';
                
                    // Check if it's a Vimeo URL
                    if (isVimeoUrl(heroMedia)) {
                        const embedUrl = getVimeoEmbedUrl(heroMedia);
                        if (embedUrl) {
                            const iframe = document.createElement('iframe');
                            iframe.src = embedUrl;
                            iframe.className = 'content-section-hero-video';
                            iframe.setAttribute('frameborder', '0');
                            iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
                            iframe.setAttribute('allowfullscreen', '');
                            iframe.style.width = '100%';
                            iframe.style.height = '100%';
                            iframe.style.position = 'absolute';
                            iframe.style.top = '0';
                            iframe.style.left = '0';
                            heroDiv.appendChild(iframe);
                        }
                    } else if (isVideoDataUrl(heroMedia)) {
                        // Video file (base64)
                        const video = document.createElement('video');
                        video.src = heroMedia;
                        video.className = 'content-section-hero-video';
                        video.setAttribute('autoplay', '');
                        video.setAttribute('loop', '');
                        video.setAttribute('muted', '');
                        video.setAttribute('playsinline', '');
                        video.style.width = '100%';
                        video.style.height = '100%';
                        video.style.position = 'absolute';
                        video.style.top = '0';
                        video.style.left = '0';
                        video.style.objectFit = 'cover';
                        heroDiv.appendChild(video);
                    } else {
                        // Regular image
                        const img = document.createElement('img');
                        img.src = heroMedia;
                        img.alt = sectionTitle || '';
                        img.className = 'content-section-hero-image';
                        heroDiv.appendChild(img);
                    }
                
                const h2Clone = h2.cloneNode(true);
                heroDiv.appendChild(h2Clone);
                section.insertBefore(heroDiv, section.firstChild);
                h2.remove();
            }
        }
        
        // Helper function to render section with hero image
        function renderSectionWithHero(sectionId, sectionData, sectionTitle, sectionIndex = 0) {
            const section = document.getElementById(sectionId);
            const contentDiv = document.getElementById(`${sectionId}-content`);
            if (!section || !contentDiv) return;
            
            // Start hidden for scroll-triggered animation
            section.style.opacity = '0';
            section.setAttribute('data-animate-on-scroll', 'true');
            
            // Remove existing hero if any
            const existingHero = section.querySelector('.content-section-hero');
            if (existingHero) existingHero.remove();
            
            const h2 = section.querySelector('h2');
            if (!h2) return;
            
            let hasMedia = false;
            if (sectionData && typeof sectionData === 'object' && sectionData.image) {
                hasMedia = true;
                section.classList.add('has-hero');
                
                // Create hero div
                const heroDiv = document.createElement('div');
                heroDiv.className = 'content-section-hero';
                
                    // Check if it's a Vimeo URL
                    if (isVimeoUrl(sectionData.image)) {
                        const embedUrl = getVimeoEmbedUrl(sectionData.image);
                        if (embedUrl) {
                            const iframe = document.createElement('iframe');
                            iframe.src = embedUrl;
                            iframe.className = 'content-section-hero-video';
                            iframe.setAttribute('frameborder', '0');
                            iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
                            iframe.setAttribute('allowfullscreen', '');
                            iframe.style.width = '100%';
                            iframe.style.height = '100%';
                            iframe.style.position = 'absolute';
                            iframe.style.top = '0';
                            iframe.style.left = '0';
                            heroDiv.appendChild(iframe);
                        }
                    } else if (isVideoDataUrl(sectionData.image)) {
                        // Video file (base64)
                        const video = document.createElement('video');
                        video.src = sectionData.image;
                        video.className = 'content-section-hero-video';
                        video.setAttribute('autoplay', '');
                        video.setAttribute('loop', '');
                        video.setAttribute('muted', '');
                        video.setAttribute('playsinline', '');
                        video.style.width = '100%';
                        video.style.height = '100%';
                        video.style.position = 'absolute';
                        video.style.top = '0';
                        video.style.left = '0';
                        video.style.objectFit = 'cover';
                        heroDiv.appendChild(video);
                    } else {
                        // Regular image
                        const img = document.createElement('img');
                        img.src = sectionData.image;
                        img.alt = sectionTitle || '';
                        img.className = 'content-section-hero-image';
                        heroDiv.appendChild(img);
                    }
                
                // Move h2 into hero
                const h2Clone = h2.cloneNode(true);
                heroDiv.appendChild(h2Clone);
                h2.remove();
                
                // Insert hero at the beginning
                section.insertBefore(heroDiv, section.firstChild);
            } else {
                section.classList.remove('has-hero');
            }
            
            // Render content with alternating light color backgrounds
            contentDiv.className = 'content-section-content';
            
            // Apply light brand color as background (alternating through light colors)
            // Apply to the full section (not just content) so heading area is also tinted
            const colorIndex = sectionIndex % sectionColors.length;
            const bgColor = sectionColors[colorIndex] || '#ffffff';
            section.style.backgroundColor = bgColor;
            contentDiv.style.backgroundColor = 'transparent';
            section.setAttribute('data-section-index', sectionIndex);
            
            if (sectionData && typeof sectionData === 'object') {
                contentDiv.innerHTML = formatContent(sectionData.content || '');
            } else if (sectionData) {
                contentDiv.innerHTML = formatContent(sectionData);
            }
        }
        
        // Get hidden sections early
        const hiddenSections = content.hiddenSections || {};
        
        let sectionIndex = 0;
        
        // 00. The Name of the Project (now includes introduction content)
        const frameRebelSection = document.getElementById('frame-rebel');
        const frameRebelContent = document.getElementById('frame-rebel-content');
        if (frameRebelSection && frameRebelContent && !hiddenSections['frame-rebel'] && content.frameRebel) {
            const h2 = frameRebelSection.querySelector('h2');
            const hasFrameRebelHero = content.frameRebel && content.frameRebel.image;
            if (hasFrameRebelHero) {
                frameRebelSection.classList.add('has-hero');
                const existingHero = frameRebelSection.querySelector('.content-section-hero');
                if (!existingHero) {
                    const heroDiv = document.createElement('div');
                    heroDiv.className = 'content-section-hero';
                    
                    // Check if it's a Vimeo URL
                    if (isVimeoUrl(content.frameRebel.image)) {
                        const embedUrl = getVimeoEmbedUrl(content.frameRebel.image);
                        if (embedUrl) {
                            const iframe = document.createElement('iframe');
                            iframe.src = embedUrl;
                            iframe.className = 'content-section-hero-video';
                            iframe.setAttribute('frameborder', '0');
                            iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
                            iframe.setAttribute('allowfullscreen', '');
                            iframe.style.width = '100%';
                            iframe.style.height = '100%';
                            iframe.style.position = 'absolute';
                            iframe.style.top = '0';
                            iframe.style.left = '0';
                            heroDiv.appendChild(iframe);
                        }
                    } else if (isVideoDataUrl(content.frameRebel.image)) {
                        // Video file (base64)
                        const video = document.createElement('video');
                        video.src = content.frameRebel.image;
                        video.className = 'content-section-hero-video';
                        video.setAttribute('autoplay', '');
                        video.setAttribute('loop', '');
                        video.setAttribute('muted', '');
                        video.setAttribute('playsinline', '');
                        video.style.width = '100%';
                        video.style.height = '100%';
                        video.style.position = 'absolute';
                        video.style.top = '0';
                        video.style.left = '0';
                        video.style.objectFit = 'cover';
                        heroDiv.appendChild(video);
                    } else {
                        // Regular image
                        const img = document.createElement('img');
                        img.src = content.frameRebel.image;
                        img.alt = brandName;
                        img.className = 'content-section-hero-image';
                        heroDiv.appendChild(img);
                    }
                    
                    // Don't add h2 to hero - removed per user request
                    frameRebelSection.insertBefore(heroDiv, frameRebelSection.firstChild);
                    // Remove the h2 heading completely
                    if (h2) {
                        h2.remove();
                    }
                }
            } else if (h2) {
                // Remove h2 even if no hero image
                h2.remove();
            }
            let html = '';
            if (content.frameRebel.aboutTheProject) {
                html += '<div class="subsection" id="frame-rebel-aboutTheProject"><div class="subsection-title">About The Project</div>';
                // Image is only used as hero for the section, not shown here
                html += `<div class="subsection-content">${formatContent(content.frameRebel.aboutTheProject.content || '')}</div></div>`;
            }
            if (content.frameRebel.fundamentalPillars) {
                html += '<div class="subsection" id="frame-rebel-fundamentalPillars"><div class="subsection-title">Fundamental Pillars</div>';
                html += `<div class="subsection-content">${formatContent(content.frameRebel.fundamentalPillars.content || '')}</div>`;
                const fpImages = content.frameRebel.fundamentalPillars.image || content.frameRebel.fundamentalPillars.images;
                if (fpImages) {
                    const fpImagesArray = Array.isArray(fpImages) ? fpImages : [fpImages];
                    html += '<div class="subsection-images">';
                    fpImagesArray.forEach((img, idx) => {
                        html += `<div class="subsection-image"><img src="${img}" alt="Fundamental Pillars${fpImagesArray.length > 1 ? ` - ${idx + 1}` : ''}"></div>`;
                    });
                    html += '</div>';
                }
                html += `</div>`;
            }
            if (content.frameRebel.toneOfVoice) {
                html += '<div class="subsection" id="frame-rebel-toneOfVoice"><div class="subsection-title">Tone of Voice</div>';
                html += `<div class="subsection-content">${formatContent(content.frameRebel.toneOfVoice.content || '')}</div>`;
                const tovImages = content.frameRebel.toneOfVoice.image || content.frameRebel.toneOfVoice.images;
                if (tovImages) {
                    const tovImagesArray = Array.isArray(tovImages) ? tovImages : [tovImages];
                    html += '<div class="subsection-images">';
                    tovImagesArray.forEach((img, idx) => {
                        html += `<div class="subsection-image"><img src="${img}" alt="Tone of Voice${tovImagesArray.length > 1 ? ` - ${idx + 1}` : ''}"></div>`;
                    });
                    html += '</div>';
                }
                html += `</div>`;
            }
            frameRebelContent.className = 'content-section-content';
            frameRebelContent.innerHTML = html;
            sectionIndex++;
        }
        
        // 01. Logotype - Add/Remove approach
        const logotypeSection = document.getElementById('logotype');
        const logotypeContent = document.getElementById('logotype-content');
        
        // Use add/remove approach - only render if not hidden and data exists
        if (logotypeSection && logotypeContent && !hiddenSections['logotype'] && content.logotype) {
            // Check for hero image (use content.logotype.image if available, otherwise first subsection image)
            let logotypeHeroImage = null;
            if (content.logotype.image) {
                logotypeHeroImage = content.logotype.image;
            } else if (content.logotype.subsections && Array.isArray(content.logotype.subsections)) {
                const firstSubsectionWithImage = content.logotype.subsections.find(sub => {
                    // Handle both single image string and array of images
                    const subImage = sub.image;
                    if (!subImage) return false;
                    if (Array.isArray(subImage) && subImage.length > 0) return true;
                    if (typeof subImage === 'string' && subImage.trim()) return true;
                    return false;
                });
                if (firstSubsectionWithImage) {
                    const subImage = firstSubsectionWithImage.image;
                    logotypeHeroImage = Array.isArray(subImage) ? subImage[0] : subImage;
                }
            }
            
            const h2Logotype = logotypeSection.querySelector('h2');
            if (logotypeHeroImage && h2Logotype) {
                addSectionHero(logotypeSection, logotypeHeroImage, 'Logotype');
            } else if (h2Logotype) {
                logotypeSection.classList.remove('has-hero');
            }
            
            // Add download button for logotype (always visible)
            setTimeout(() => {
                addDownloadButtonToHeading(logotypeSection, (content.logotype && content.logotype.downloadUrl) || '', 'Download Logo');
            }, 0);
            
            let logoHtml = '';
            
            // Helper function to render images in a grid (max 3 columns)
            function renderSubsectionImages(images, title, heroImage) {
                if (!images || (Array.isArray(images) && images.length === 0) || (typeof images === 'string' && !images.trim())) {
                    return '';
                }
                
                // Convert single image to array for consistent handling
                const imageArray = Array.isArray(images) ? images : [images];
                // Filter out hero image if it's being used as section hero
                const filteredImages = imageArray.filter(img => img !== heroImage);
                
                if (filteredImages.length === 0) return '';
                
                let html = '<div class="subsection-images">';
                filteredImages.forEach((img, idx) => {
                    html += `<div class="subsection-image"><img src="${img}" alt="${title}${filteredImages.length > 1 ? ` - ${idx + 1}` : ''}"></div>`;
                });
                html += '</div>';
                
                return html;
            }
            
            // Helper function to render a single subsection
            function renderLogotypeSubsection(subsection, index) {
                const title = subsection.title || '';
                const contentText = subsection.content || '';
                const images = subsection.image || subsection.images || '';
                const downloadUrl = subsection.downloadUrl || '';
                const hasImages = !!(Array.isArray(images) ? images.length > 0 : images);
                const hasDownloadUrl = !!downloadUrl;
                const contentOnlyClass = !hasImages && contentText ? 'logotype-content-only' : '';
                const subsectionId = `logotype-subsection-${index}`;
                
                console.log(`Rendering subsection ${index}:`, { 
                    title, 
                    hasContent: !!contentText, 
                    hasImages, 
                    contentLength: contentText.length,
                    generateDoNotExamples: subsection.generateDoNotExamples,
                    images: images
                });
                
                let html = `<div class="subsection ${contentOnlyClass}" id="${subsectionId}">`;
                html += `<div class="subsection-title">${title}`;
                if (hasDownloadUrl) {
                    html += `<a href="${downloadUrl}" target="_blank" rel="noopener noreferrer" class="download-logo-btn" title="Download ${title}">Download</a>`;
                }
                html += `</div>`;
                
                // Content first, then images
                html += `<div class="subsection-content">${formatContent(contentText)}</div>`;
                
                // Images after content (excluding hero image)
                html += renderSubsectionImages(images, title, logotypeHeroImage);
                
                // Automatically generate DO NOT examples only if this subsection has the generateDoNotExamples flag AND title is "DO NOT"
                // Place DO NOT grid outside subsection-content (like subsection-images) so it can span full width
                // Double-check title to prevent examples from appearing in other subsections
                const isDoNotSubsection = subsection.generateDoNotExamples && title.toLowerCase().trim() === 'do not';
                if (isDoNotSubsection) {
                    console.log(`✓ generateDoNotExamples is TRUE and title matches "DO NOT" for subsection ${index} - attempting to generate DO NOT examples`);
                    
                    let logoSVG = null;
                    let logoSVGSource = null;
                    
                    // DO NOT subsections should always use the main logo, not subsection images
                    // Skip checking subsection images and go straight to main logo
                    if (content.logo) {
                        console.log('DO NOT subsection: Using main logo from content.logo');
                        if (content.logo.trim().startsWith('<svg') || content.logo.includes('data:image/svg+xml')) {
                            logoSVG = content.logo;
                            logoSVGSource = 'main-logo';
                            
                            if (content.logo.includes('data:image/svg+xml')) {
                                try {
                                    if (content.logo.includes(';base64,')) {
                                        const base64Match = content.logo.match(/data:image\/svg\+xml[^,]*;base64,(.+)/);
                                        if (base64Match) {
                                            logoSVG = atob(base64Match[1]);
                                            console.log('Decoded base64 SVG from main logo, length:', logoSVG.length);
                                        }
                                    } else {
                                        const urlMatch = content.logo.match(/data:image\/svg\+xml[^,]*,?(.+)/);
                                        if (urlMatch) {
                                            logoSVG = decodeURIComponent(urlMatch[1]);
                                            console.log('Decoded URL-encoded SVG from main logo, length:', logoSVG.length);
                                        }
                                    }
                                } catch (e) {
                                    console.warn('Could not decode main logo SVG data URL:', e);
                                    logoSVG = null;
                                }
                            } else {
                                // It's already an inline SVG
                                console.log('Using inline SVG from main logo, length:', logoSVG.length);
                            }
                        }
                    }
                    
                    // Generate DO NOT examples if we have an SVG
                    if (logoSVG) {
                        console.log(`Generating DO NOT examples with SVG from ${logoSVGSource}, brandName:`, content.brandName);
                        const doNotHtml = generateDoNotExamples(logoSVG, content.brandName);
                        console.log('Generated DO NOT HTML length:', doNotHtml.length);
                        html += doNotHtml;
                    } else {
                        console.warn('No SVG logo available (neither in subsection images nor in content.logo), cannot generate DO NOT examples');
                    }
                } else {
                    console.log(`✗ generateDoNotExamples is FALSE/UNDEFINED for subsection ${index} - skipping DO NOT examples`);
                }
                
                html += `</div>`;
                
                return html;
            }
            
            // Render subsections array (new structure)
            if (content.logotype && content.logotype.subsections && Array.isArray(content.logotype.subsections) && content.logotype.subsections.length > 0) {
                content.logotype.subsections.forEach((subsection, index) => {
                    // Check if this subsection has tabs (for Main logotype section)
                    if (subsection.tabs && subsection.hasTabs) {
                        // Render tabbed subsection with grid layout
                        const tabKeys = Object.keys(subsection.tabs);
                        if (tabKeys.length > 0) {
                            const usageDownloadUrl = subsection.downloadUrl || '';
                            logoHtml += '<div class="logo-usage-section">';
                            
                            // Left column: heading, download button, and tabs
                            logoHtml += '<div class="logo-usage-left">';
                            logoHtml += `<div class="subsection-title">${subsection.title || 'Main'}</div>`;
                            if (usageDownloadUrl) {
                                logoHtml += `<a href="${usageDownloadUrl}" target="_blank" rel="noopener noreferrer" class="download-logo-btn" title="Download ${subsection.title || 'Main'}">Download</a>`;
                            }
                            logoHtml += '<div class="usage-tabs">';
                            
                            // Render tab buttons
                            tabKeys.forEach((tabKey, tabIndex) => {
                                const tabLabel = subsection.tabs[tabKey].label || (tabKey === 'light' ? 'Light' : tabKey === 'dark' ? 'Dark' : tabKey === 'color' ? 'Color' : tabKey === 'positive' ? 'Positive' : tabKey === 'negative' ? 'Negative' : tabKey.charAt(0).toUpperCase() + tabKey.slice(1));
                                logoHtml += `<button class="usage-tab ${tabIndex === 0 ? 'active' : ''}" data-tab="${tabKey}">${tabLabel}</button>`;
                            });
                            
                            logoHtml += '</div>'; // Close usage-tabs
                            logoHtml += '</div>'; // Close logo-usage-left
                            
                            // Right column: tab content
                            logoHtml += '<div class="logo-usage-right">';
                            
                            // Render tab content
                            tabKeys.forEach((tabKey, tabIndex) => {
                                const tab = subsection.tabs[tabKey];
                                const tabContent = tab.content || '';
                                const tabImage = tab.image || tab.images || '';
                                const hasTabImage = !!(tabImage || (Array.isArray(tab.images) && tab.images.length > 0));
                                const tabContentOnlyClass = !hasTabImage && tabContent ? 'logotype-content-only' : '';
                                
                                logoHtml += `<div class="usage-tab-content ${tabIndex === 0 ? 'active' : ''}" data-content="${tabKey}">`;
                                logoHtml += `<div class="subsection ${tabContentOnlyClass}" id="logotype-usage-${tabKey}">`;
                                
                                // Content first, then images
                                logoHtml += `<div class="subsection-content">${formatContent(tabContent)}</div>`;
                                
                                // Render images (handle both single and array, support both image and images properties)
                                const tabImages = tab.images ? (Array.isArray(tab.images) ? tab.images : [tab.images]) : (tabImage ? (Array.isArray(tabImage) ? tabImage : [tabImage]) : []);
                                if (tabImages.length > 0) {
                                    logoHtml += '<div class="subsection-images">';
                                    tabImages.forEach((img, idx) => {
                                        logoHtml += `<div class="subsection-image"><img src="${img}" alt="${subsection.title} - ${tabKey}${tabImages.length > 1 ? ` - ${idx + 1}` : ''}"></div>`;
                                    });
                                    logoHtml += '</div>';
                                }
                                
                                // Auto-generate logo examples based on tab type (light/dark/color)
                                if (content.logo) {
                                    logoHtml += '<div class="color-examples-grid">';
                                    
                                    if (tabKey === 'light') {
                                        // Light backgrounds: white and light brand colors
                                        const lightBackgrounds = ['#ffffff'];
                                        if (content.colors && Array.isArray(content.colors)) {
                                            content.colors.forEach((color) => {
                                                if (color.hex && color.type === 'secondary') {
                                                    // Check if it's a light color
                                                    const rgb = hexToRgb(color.hex);
                                                    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
                                                    if (luminance > 0.5) {
                                                        lightBackgrounds.push(color.hex);
                                                    }
                                                }
                                            });
                                        }
                                        // Use white and up to 3 light colors
                                        lightBackgrounds.slice(0, 4).forEach((bgColor) => {
                                            const logoColor = getTextColorForBackground(bgColor);
                                            const coloredLogo = applyColorToSVG(content.logo, logoColor);
                                            logoHtml += `<div class="color-example-item" style="background-color: ${bgColor};">
                                                <div class="color-example-logo" style="color: ${logoColor};">${coloredLogo}</div>
                                            </div>`;
                                        });
                                    } else if (tabKey === 'dark') {
                                        // Dark backgrounds: black and dark brand colors
                                        const darkBackgrounds = ['#000000'];
                                        if (content.colors && Array.isArray(content.colors)) {
                                            content.colors.forEach((color) => {
                                                if (color.hex && color.type === 'primary') {
                                                    // Check if it's a dark color
                                                    const rgb = hexToRgb(color.hex);
                                                    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
                                                    if (luminance <= 0.5) {
                                                        darkBackgrounds.push(color.hex);
                                                    }
                                                }
                                            });
                                        }
                                        // Use black and up to 3 dark colors
                                        darkBackgrounds.slice(0, 4).forEach((bgColor) => {
                                            const logoColor = getTextColorForBackground(bgColor);
                                            const coloredLogo = applyColorToSVG(content.logo, logoColor);
                                            logoHtml += `<div class="color-example-item" style="background-color: ${bgColor};">
                                                <div class="color-example-logo" style="color: ${logoColor};">${coloredLogo}</div>
                                            </div>`;
                                        });
                                    } else if (tabKey === 'color') {
                                        // Color backgrounds: use all brand colors
                                        if (content.colors && Array.isArray(content.colors) && content.colors.length > 0) {
                                            content.colors.forEach((color) => {
                                                if (color.hex) {
                                                    const logoColor = getTextColorForBackground(color.hex);
                                                    const coloredLogo = applyColorToSVG(content.logo, logoColor);
                                                    logoHtml += `<div class="color-example-item" style="background-color: ${color.hex};">
                                                        <div class="color-example-logo" style="color: ${logoColor};">${coloredLogo}</div>
                                                    </div>`;
                                                }
                                            });
                                        }
                                    }
                                    
                                    logoHtml += '</div>';
                                }
                                
                                logoHtml += `</div>`;
                                logoHtml += `</div>`;
                            });
                            
                            logoHtml += '</div>'; // Close logo-usage-right
                            logoHtml += '</div>'; // Close logo-usage-section
                        }
                    } else {
                        // Regular subsection
                        logoHtml += renderLogotypeSubsection(subsection, index);
                    }
                });
            } else {
                console.log('No logotype.subsections array found, using fallback');
                // Fallback: handle old structure for backwards compatibility
                if (content.logotype.main && content.logotype.main.positive) {
                    logoHtml += renderLogotypeSubsection({ title: 'Main (Positive)', ...content.logotype.main.positive }, 0);
                }
                if (content.logotype.black || content.logotype.white || content.logotype.color) {
                    logoHtml += '<div class="logo-usage-section">';
                    logoHtml += '<div class="subsection-title">Logo Usage</div>';
                    logoHtml += '<div class="usage-tabs">';
                    
                    let firstTab = true;
                    if (content.logotype.black) {
                        logoHtml += `<button class="usage-tab ${firstTab ? 'active' : ''}" data-tab="black">Dark</button>`;
                        firstTab = false;
                    }
                    if (content.logotype.white) {
                        logoHtml += `<button class="usage-tab ${firstTab ? 'active' : ''}" data-tab="white">Light</button>`;
                        firstTab = false;
                    }
                    if (content.logotype.color) {
                        logoHtml += `<button class="usage-tab ${firstTab ? 'active' : ''}" data-tab="color">Color</button>`;
                    }
                    logoHtml += '</div>';
                    
                    let firstContent = true;
                    if (content.logotype.black) {
                        logoHtml += `<div class="usage-tab-content ${firstContent ? 'active' : ''}" data-content="black">`;
                        logoHtml += renderLogotypeSubsection({ title: 'Dark', ...content.logotype.black }, 'black');
                        logoHtml += '</div>';
                        firstContent = false;
                    }
                    if (content.logotype.white) {
                        logoHtml += `<div class="usage-tab-content ${firstContent ? 'active' : ''}" data-content="white">`;
                        logoHtml += renderLogotypeSubsection({ title: 'Light', ...content.logotype.white }, 'white');
                        logoHtml += '</div>';
                        firstContent = false;
                    }
                    if (content.logotype.color) {
                        logoHtml += `<div class="usage-tab-content ${firstContent ? 'active' : ''}" data-content="color">`;
                        logoHtml += renderLogotypeSubsection({ title: 'Color', ...content.logotype.color }, 'color');
                        logoHtml += '</div>';
                    }
                    logoHtml += '</div>';
                }
            }
            
            logotypeContent.className = 'content-section-content';
            if (logoHtml && logoHtml.trim().length > 0) {
                logotypeContent.innerHTML = logoHtml;
            } else {
                logotypeContent.innerHTML = '<p>No logotype content available. Please add subsections in the admin panel.</p>';
            }
            sectionIndex++;
        } else if (logotypeSection && hiddenSections['logotype']) {
            // Remove section if hidden
            logotypeSection.remove();
        }
        
        // 03. Typography section (special handling - has preview)
        const typographySection = document.getElementById('typography');
        const typographyContent = document.getElementById('typography-content');
        if (typographySection && typographyContent && !hiddenSections['typography'] && content.typographySection) {
            const h2 = typographySection.querySelector('h2');
            
            // Check for hero image
            const typographyHeroImage = content.typographySection.image || null;
            
            if (typographyHeroImage && h2) {
                addSectionHero(typographySection, typographyHeroImage, 'Typography');
            } else if (h2) {
                typographySection.classList.remove('has-hero');
            }
            
            typographySection.setAttribute('data-section-index', sectionIndex++);
            
            // Load fonts for download buttons in heading (after hero handling so we have correct h2)
            setTimeout(() => {
                loadFontsDownloadButtons();
                
                // Add download button for typography (always visible)
                addDownloadButtonToHeading(typographySection, (content.typographySection && content.typographySection.downloadUrl) || '', 'Download Fonts');
            }, 0);
            
        }
        
        
        // 02. Color section
        const colorSection = document.getElementById('color');
        const colorContent = document.getElementById('color-content');
        if (colorSection && colorContent && !hiddenSections['color']) {
            const h2 = colorSection.querySelector('h2');
            
            // Check for hero image (use content.color.image if available, otherwise corporateColors.image)
            let colorHeroImage = null;
            if (content.color && content.color.image) {
                colorHeroImage = content.color.image;
            } else if (content.color && content.color.corporateColors && content.color.corporateColors.image) {
                colorHeroImage = content.color.corporateColors.image;
            }
            
            if (colorHeroImage && h2) {
                addSectionHero(colorSection, colorHeroImage, 'Color');
            } else if (h2) {
                colorSection.classList.remove('has-hero');
            }
            
            colorSection.setAttribute('data-section-index', sectionIndex++);
            
            // Render color subsections
            let colorHtml = '';
            
            // Render Corporate Colors explanation FIRST, before the palette
            if (content.color && content.color.corporateColors) {
                colorHtml += '<div class="subsection" id="color-corporateColors"><div class="subsection-title">Corporate Colors</div>';
                colorHtml += `<div class="subsection-content">${formatContent(content.color.corporateColors.content || '')}</div></div>`;
            }
            
            // Then render the color palette
            if (content.colors && Array.isArray(content.colors)) {
                colorHtml += renderColorPalette(content.colors);
            }
            if (content.color && content.color.correctApplications) {
                colorHtml += '<div class="subsection" id="color-correctApplications"><div class="subsection-title">Correct Applications</div>';
                colorHtml += `<div class="subsection-content subsection-content-two-columns">${formatContent(content.color.correctApplications.content || '')}</div>`;
                // Auto-generate examples from brand colors
                if (content.logo && content.colors && Array.isArray(content.colors) && content.colors.length > 0) {
                    colorHtml += '<div class="color-examples-grid">';
                    content.colors.forEach((color) => {
                        if (color.hex) {
                            // Determine logo color based on background luminance
                            const logoColor = getTextColorForBackground(color.hex);
                            // Apply color to SVG using string replacement
                            const coloredLogo = applyColorToSVG(content.logo, logoColor);
                            colorHtml += `<div class="color-example-item" style="background-color: ${color.hex};">
                                <div class="color-example-logo" style="color: ${logoColor};">${coloredLogo}</div>
                            </div>`;
                        }
                    });
                    colorHtml += '</div>';
                }
                colorHtml += '</div>';
            }
            if (content.color && content.color.monochromatic) {
                colorHtml += '<div class="subsection" id="color-monochromatic"><div class="subsection-title">Monochromatic (One Ink)</div>';
                colorHtml += `<div class="subsection-content subsection-content-two-columns">${formatContent(content.color.monochromatic.content || '')}</div>`;
                // Auto-generate monochromatic examples: black background (white logo) and white background (black logo)
                if (content.logo) {
                    colorHtml += '<div class="color-examples-grid">';
                    // Black background with white logo
                    const whiteLogo = applyColorToSVG(content.logo, '#ffffff');
                    colorHtml += `<div class="color-example-item" style="background-color: #000000;">
                        <div class="color-example-logo" style="color: #ffffff;">${whiteLogo}</div>
                    </div>`;
                    // White background with black logo
                    const blackLogo = applyColorToSVG(content.logo, '#000000');
                    colorHtml += `<div class="color-example-item" style="background-color: #ffffff;">
                        <div class="color-example-logo" style="color: #000000;">${blackLogo}</div>
                    </div>`;
                    colorHtml += '</div>';
                }
                colorHtml += '</div>';
            }
            if (content.color && content.color.incorrectApplications) {
                colorHtml += '<div class="subsection" id="color-incorrectApplications"><div class="subsection-title">Incorrect Applications</div>';
                colorHtml += `<div class="subsection-content subsection-content-two-columns">${formatContent(content.color.incorrectApplications.content || '')}</div>`;
                // Auto-generate incorrect examples with random/poor contrast colors
                if (content.logo) {
                    const incorrectColors = generateIncorrectColorExamples(content.colors);
                    colorHtml += '<div class="color-examples-grid">';
                    incorrectColors.forEach((bgColor) => {
                        // Determine logo color based on background luminance
                        const logoColor = getTextColorForBackground(bgColor);
                        // Apply color to SVG using string replacement
                        const coloredLogo = applyColorToSVG(content.logo, logoColor);
                        colorHtml += `<div class="color-example-item" style="background-color: ${bgColor};">
                            <div class="color-example-logo" style="color: ${logoColor};">${coloredLogo}</div>
                        </div>`;
                    });
                    colorHtml += '</div>';
                }
                colorHtml += '</div>';
            }
            
            colorContent.className = 'content-section-content';
            colorContent.innerHTML = colorHtml;
            
            // After rendering, check the computed background color and adjust text color
            // Only apply to text content before the color palette
            setTimeout(() => {
                const computedStyle = window.getComputedStyle(colorContent);
                const bgColor = computedStyle.backgroundColor || 'rgb(255, 255, 255)';
                const bgHex = rgbToHex(bgColor);
                const textColor = getContrastColor(bgHex);
                
                // Find the color palette container to exclude it from text color changes
                const colorPalette = colorContent.querySelector('.color-palette-container');
                
                // Apply text color to all text content BEFORE the color palette
                const allElements = colorContent.querySelectorAll('*');
                allElements.forEach(el => {
                    // Skip if this element is inside the color palette
                    if (colorPalette && colorPalette.contains(el)) {
                        return;
                    }
                    // Apply text color to text elements
                    if (el.tagName === 'P' || el.classList.contains('subsection') || 
                        el.classList.contains('subsection-content') || 
                        el.classList.contains('subsection-title') || 
                        el.classList.contains('subsection-number')) {
                        el.style.color = textColor;
                    }
                });
                
                // Also set on the container itself for any direct text (but don't override color palette)
                if (!colorPalette || !colorContent.contains(colorPalette) || colorContent.firstChild !== colorPalette) {
                    colorContent.style.color = textColor;
                }
            }, 0);
        }
        
        // 04. Applications
        const applicationsSection = document.getElementById('applications');
        const applicationsContent = document.getElementById('applications-content');
        if (applicationsSection && applicationsContent && !hiddenSections['applications'] && content.applications) {
            // Check if it's array format (new) or object format (old)
            let applicationsArray = [];
            if (Array.isArray(content.applications)) {
                applicationsArray = content.applications;
            } else {
                // Migrate old format to array
                const oldSubsections = ['businessCards', 'deckSlides', 'socialPosts', 'badgesAndTape', 'capAndTshirt', 'cardAndTape', 'stick'];
                const oldNames = ['Business Cards', 'Deck Slides', 'Social Posts', 'Badges & Tape', 'Cap & T-shirt', 'Card & Tape', 'Stick'];
                oldSubsections.forEach((subsection, index) => {
                    if (content.applications[subsection]) {
                        const data = content.applications[subsection];
                        applicationsArray.push({
                            title: oldNames[index],
                            content: typeof data === 'object' ? data.content : data,
                            image: typeof data === 'object' ? data.image : ''
                        });
                    }
                });
            }
            
            // Check for hero image (use content.applications.image if available, otherwise first application image)
            let applicationsHeroImage = null;
            if (content.applications && content.applications.image) {
                applicationsHeroImage = content.applications.image;
            } else if (applicationsArray.length > 0 && applicationsArray[0].image) {
                const firstAppImage = applicationsArray[0].image;
                applicationsHeroImage = Array.isArray(firstAppImage) ? firstAppImage[0] : firstAppImage;
            }
            
            const h2Applications = applicationsSection.querySelector('h2');
            if (applicationsHeroImage && h2Applications) {
                addSectionHero(applicationsSection, applicationsHeroImage, 'Applications');
            } else if (h2Applications) {
                applicationsSection.classList.remove('has-hero');
            }
            
            // Background will be handled by CSS :not(.has-hero) selector
            let html = '';
            applicationsArray.forEach((app, index) => {
                if (!app.title) return; // Skip if no title
                const subsectionId = `applications-${index}`;
                html += `<div class="subsection" id="${subsectionId}"><div class="subsection-title">${app.title}</div>`;
                html += `<div class="subsection-content">${formatContent(app.content || '')}</div>`;
                
                // Render images (handle both single and array, excluding hero image)
                const appImages = app.image || app.images;
                if (appImages) {
                    const appImagesArray = Array.isArray(appImages) ? appImages : [appImages];
                    const filteredImages = appImagesArray.filter(img => img !== applicationsHeroImage);
                    if (filteredImages.length > 0) {
                        html += '<div class="subsection-images">';
                        filteredImages.forEach((img, idx) => {
                            html += `<div class="subsection-image"><img src="${img}" alt="${app.title}${filteredImages.length > 1 ? ` - ${idx + 1}` : ''}"></div>`;
                        });
                        html += '</div>';
                    }
                }
                
                html += `</div>`;
            });
            
            applicationsContent.className = 'content-section-content';
            applicationsContent.innerHTML = html;
            sectionIndex++;
        }
        
        // Helper: render a generic dynamic-subsection section (Graphic Language, Photography)
        function renderDynamicSection(sectionId, dataArray, heroImage) {
            const section = document.getElementById(sectionId);
            const contentDiv = document.getElementById(`${sectionId}-content`);
            if (!section || !contentDiv) return;

            const h2 = section.querySelector('h2');
            if (heroImage && h2) {
                addSectionHero(section, heroImage, sectionId);
            } else if (h2) {
                section.classList.remove('has-hero');
            }

            let html = '';
            dataArray.forEach((item, index) => {
                if (!item.title) return;
                const subsectionId = `${sectionId}-${index}`;
                html += `<div class="subsection" id="${subsectionId}">`;
                html += `<div class="subsection-title">${item.title}</div>`;
                html += `<div class="subsection-content">${formatContent(item.content || '')}</div>`;

                const images = item.image || item.images;
                if (images) {
                    const imgArray = Array.isArray(images) ? images : [images];
                    const filtered = imgArray.filter(img => img !== heroImage);
                    if (filtered.length > 0) {
                        html += '<div class="subsection-images">';
                        filtered.forEach((img, idx) => {
                            html += `<div class="subsection-image"><img src="${img}" alt="${item.title}${filtered.length > 1 ? ` - ${idx + 1}` : ''}"></div>`;
                        });
                        html += '</div>';
                    }
                }
                html += '</div>';
            });

            contentDiv.className = 'content-section-content';
            contentDiv.innerHTML = html || '<p style="padding:3rem 5rem">No content yet. Edit via admin panel.</p>';
            sectionIndex++;
        }

        // 04. Graphic Language
        {
            const glRaw = content.graphicLanguage;
            const glItems = Array.isArray(glRaw) ? glRaw : (glRaw?.items || []);
            const glHero = Array.isArray(glRaw)
                ? (glRaw.find(i => i.image)?.image || null)
                : (glRaw?.hero || null);
            if (!hiddenSections['graphic-language'] && glItems.length > 0) {
                renderDynamicSection('graphic-language', glItems, glHero);
            } else if (document.getElementById('graphic-language') && hiddenSections['graphic-language']) {
                document.getElementById('graphic-language').remove();
            }
        }

        // 05. Photography
        {
            const phRaw = content.photography;
            const phItems = Array.isArray(phRaw) ? phRaw : (phRaw?.items || []);
            const phHero = Array.isArray(phRaw)
                ? (phRaw.find(i => i.image)?.image || null)
                : (phRaw?.hero || null);
            if (!hiddenSections['photography'] && phItems.length > 0) {
                renderDynamicSection('photography', phItems, phHero);
            } else if (document.getElementById('photography') && hiddenSections['photography']) {
                document.getElementById('photography').remove();
            }
        }

        // 07. Downloads
        const downloadsSection = document.getElementById('downloads');
        const downloadsContent = document.getElementById('downloads-content');
        if (downloadsSection && downloadsContent && !hiddenSections['downloads'] && content.downloads && Array.isArray(content.downloads) && content.downloads.length > 0) {
            const h2Downloads = downloadsSection.querySelector('h2');
            if (h2Downloads) downloadsSection.classList.remove('has-hero');

            let dlHtml = '<div class="downloads-grid">';
            content.downloads.forEach((item, index) => {
                if (!item.title) return;
                dlHtml += `<div class="download-card" id="download-${index}">`;
                dlHtml += `<div class="download-card-header">
                    <div class="download-card-title">${item.title}</div>
                    ${item.fileType ? `<span class="download-card-type">${item.fileType}</span>` : ''}
                </div>`;
                if (item.content) dlHtml += `<div class="download-card-desc">${formatContent(item.content)}</div>`;
                if (item.image) dlHtml += `<img class="download-card-preview" src="${item.image}" alt="${item.title}">`;
                if (item.downloadUrl) dlHtml += `<a class="download-card-btn" href="${item.downloadUrl}" target="_blank" rel="noopener noreferrer">Download</a>`;
                dlHtml += '</div>';
            });
            dlHtml += '</div>';

            downloadsContent.className = 'content-section-content';
            downloadsContent.innerHTML = dlHtml;
            sectionIndex++;
        } else if (downloadsSection && hiddenSections['downloads']) {
            downloadsSection.remove();
        }

        // 08. What's Next (services / upsell) — always visible
        const servicesSection = document.getElementById('services');
        const servicesContent = document.getElementById('services-content');
        if (servicesSection && servicesContent) {
            const AGENCY_EMAIL = 'hola@santahelena.agency';
            const services = [
                {
                    tag: 'Digital',
                    title: 'Website Refresh',
                    description: 'Bring your new brand identity to life online. We update your site\'s typography, colours, components and layout to match your new visual language — so your website finally looks like you.'
                },
                {
                    tag: 'Strategy',
                    title: 'Social Media Strategy',
                    description: 'Define your channels, content pillars, posting rhythm and tone of voice. A clear plan for showing up consistently and growing the right audience.'
                },
                {
                    tag: 'Templates',
                    title: 'Social Media Templates',
                    description: 'A Canva or Figma template pack — posts, stories, carousels and reels covers. Your team stays on-brand without needing a designer every time.'
                },
                {
                    tag: 'Print',
                    title: 'Print Design',
                    description: 'Business cards, letterheads, brochures, packaging and signage. Your brand in the physical world, crafted with the same care as your digital presence.'
                },
                {
                    tag: 'Creative Direction',
                    title: 'Brand Photography Direction',
                    description: 'A photography brief, mood board and art direction guide so every image you create or commission feels unmistakably on-brand.'
                },
                {
                    tag: 'Digital',
                    title: 'Email Newsletter Templates',
                    description: 'Branded email templates for Mailchimp, Klaviyo or any ESP — headers, layouts, product blocks and footers, all aligned to your new identity.'
                },
                {
                    tag: 'Motion',
                    title: 'Motion & Animation',
                    description: 'Animated logo, social motion graphics or presentation transitions. Your brand in movement — designed to perform on every screen.'
                },
                {
                    tag: 'Campaigns',
                    title: 'Campaign Design',
                    description: 'Seasonal launches, product drops or brand moments. Full art direction, copy direction and multi-channel assets, ready to go live.'
                }
            ];

            const cardsHtml = services.map(s => `
                <div class="service-card">
                    <div class="service-tag">${s.tag}</div>
                    <div class="service-title">${s.title}</div>
                    <p class="service-description">${s.description}</p>
                    <a class="service-cta" href="mailto:${AGENCY_EMAIL}?subject=${encodeURIComponent('Interested in ' + s.title)}">Get in touch →</a>
                </div>`).join('');

            servicesContent.className = 'content-section-content';
            servicesContent.innerHTML = `
                <p class="services-intro">Your brand is ready. Here's how we can help you activate it across every touchpoint.</p>
                <div class="services-grid">${cardsHtml}<div class="services-grid-footer"></div></div>
                <div class="services-banner">
                    <div class="services-banner-text">
                        <h3>Got something else in mind?</h3>
                        <p>We're always up for a good brief. Tell us what you're building.</p>
                    </div>
                    <a href="mailto:${AGENCY_EMAIL}" class="services-banner-cta">Say hello</a>
                </div>`;
            sectionIndex++;
        }

        // Apply alternating brand background colors to ALL non-hero sections
        // Use DOM order for alternation — skip sections with hero images (they handle their own bg)
        let nonHeroIdx = 0;
        document.querySelectorAll('.content-section').forEach(sec => {
            if (!sec.classList.contains('has-hero') && sectionColors.length > 0) {
                const color = sectionColors[nonHeroIdx % sectionColors.length];
                sec.style.backgroundColor = color;
                nonHeroIdx++;
            }
        });

        // Frontend section order mapping (matching new structure)
        const FRONTEND_SECTION_ORDER = [
            { id: 'frame-rebel', name: content.brandName || 'Brand Story', navName: content.brandName || 'Brand Story' },
            { id: 'logotype', name: 'Logo', navName: 'Logo' },
            { id: 'color', name: 'Colour', navName: 'Colour' },
            { id: 'typography', name: 'Typography', navName: 'Typography' },
            { id: 'graphic-language', name: 'Graphic Language', navName: 'Graphic Language' },
            { id: 'photography', name: 'Photography', navName: 'Photography' },
            { id: 'applications', name: 'Brand in Use', navName: 'Brand in Use' },
            { id: 'downloads', name: 'Downloads', navName: 'Downloads' },
            { id: 'services', name: "What's Next", navName: "What's Next" }
        ];
        
        // Build navigation dynamically based on visible sections
        function buildNavigation() {
            const sidebarNav = document.querySelector('.sidebar-nav');
            if (!sidebarNav) return;
            
            const navList = document.getElementById('main-nav-list') || sidebarNav.querySelector('.nav-list');
            if (!navList) return;
            
            // Clear existing navigation
            navList.innerHTML = '';
            
            // Define subsections for each section
            const sectionSubsections = {
                'frame-rebel': [
                    { id: 'aboutTheProject', name: 'About The Project' },
                    { id: 'fundamentalPillars', name: 'Fundamental Pillars' },
                    { id: 'toneOfVoice', name: 'Tone of Voice' }
                ],
                'logotype': [], // Will be populated dynamically from content.logotype.subsections array
                'color': [
                    { id: 'corporateColors', name: 'Corporate Colors' },
                    { id: 'correctApplications', name: 'Correct Applications' },
                    { id: 'monochromatic', name: 'Monochromatic' },
                    { id: 'incorrectApplications', name: 'Incorrect Applications' }
                ],
                'typography': [
                    { id: 'mainTypography', name: 'Main Typography' },
                    { id: 'secondaryTypography', name: 'Secondary Typography' }
                ],
                'graphic-language': [], // Will be populated dynamically
                'photography': [],      // Will be populated dynamically
                'applications': [],     // Will be populated dynamically from content.applications array
                'downloads': []         // Will be populated dynamically
            };
            
            // Populate logotype subsections dynamically from content
            if (content.logotype && content.logotype.subsections && Array.isArray(content.logotype.subsections)) {
                // Populate navigation from logotype subsections array - include ALL subsections (even tabbed ones)
                sectionSubsections['logotype'] = content.logotype.subsections
                    .map((subsection, originalIndex) => ({ subsection, originalIndex }))
                    .filter(({ subsection }) => subsection.title) // Only include subsections with titles
                    .map(({ subsection, originalIndex }) => ({
                        id: `logotype-subsection-${originalIndex}`, // Use originalIndex to match rendered HTML IDs
                        name: subsection.title || `Logotype Subsection ${originalIndex + 1}`
                    }));
            }
            
            // Populate applications subsections dynamically from content
            if (content.applications) {
                let applicationsArray = [];
                if (Array.isArray(content.applications)) {
                    applicationsArray = content.applications;
                } else {
                    // Migrate old format
                    const oldSubsections = ['businessCards', 'deckSlides', 'socialPosts', 'badgesAndTape', 'capAndTshirt', 'cardAndTape', 'stick'];
                    const oldNames = ['Business Cards', 'Deck Slides', 'Social Posts', 'Badges & Tape', 'Cap & T-shirt', 'Card & Tape', 'Stick'];
                    oldSubsections.forEach((subsection, index) => {
                        if (content.applications[subsection]) {
                            applicationsArray.push({
                                title: oldNames[index],
                                content: typeof content.applications[subsection] === 'object' ? content.applications[subsection].content : content.applications[subsection],
                                image: typeof content.applications[subsection] === 'object' ? content.applications[subsection].image : ''
                            });
                        }
                    });
                }

                // Build subsections array for navigation
                sectionSubsections['applications'] = applicationsArray
                    .filter(app => app.title) // Only include items with titles
                    .map((app, index) => ({
                        id: index.toString(),
                        name: app.title
                    }));
            }

            // Populate graphic-language subsections
            const glNavItems = Array.isArray(content.graphicLanguage) ? content.graphicLanguage : (content.graphicLanguage?.items || []);
            if (glNavItems.length > 0) {
                sectionSubsections['graphic-language'] = glNavItems
                    .filter(item => item.title)
                    .map((item, index) => ({ id: `graphic-language-${index}`, name: item.title }));
            }

            // Populate photography subsections
            const phNavItems = Array.isArray(content.photography) ? content.photography : (content.photography?.items || []);
            if (phNavItems.length > 0) {
                sectionSubsections['photography'] = phNavItems
                    .filter(item => item.title)
                    .map((item, index) => ({ id: `photography-${index}`, name: item.title }));
            }

            // Populate downloads subsections
            if (content.downloads && Array.isArray(content.downloads)) {
                sectionSubsections['downloads'] = content.downloads
                    .filter(item => item.title)
                    .map((item, index) => ({ id: `download-${index}`, name: item.title }));
            }
            
            let visibleNumber = 0; // Start at 0 for "00. Introduction"
            FRONTEND_SECTION_ORDER.forEach(section => {
                const isHidden = hiddenSections[section.id];
                if (!isHidden) {
                    const listItem = document.createElement('li');
                    const navLink = document.createElement('a');
                    navLink.href = `#${section.id}`;
                    navLink.className = 'nav-link';
                    navLink.setAttribute('data-section', section.id);
                    navLink.textContent = `${String(visibleNumber).padStart(2, '0')}. ${section.navName}`;
                    listItem.appendChild(navLink);
                    
                    // Add subsections if they exist
                    const subsections = sectionSubsections[section.id];
                    if (subsections && subsections.length > 0) {
                        const subList = document.createElement('ul');
                        subsections.forEach(subsection => {
                            const subListItem = document.createElement('li');
                            const subNavLink = document.createElement('a');
                            // For logotype and applications, use the ID directly (already includes prefix)
                            // For other sections, combine section id with subsection id
                            const subsectionId = (section.id === 'applications' || section.id === 'logotype') 
                                ? subsection.id 
                                : `${section.id}-${subsection.id}`;
                            subNavLink.href = `#${subsectionId}`;
                            subNavLink.className = 'nav-link subsection-link';
                            subNavLink.setAttribute('data-section', section.id);
                            subNavLink.setAttribute('data-subsection', subsection.id);
                            subNavLink.textContent = subsection.name;
                            subListItem.appendChild(subNavLink);
                            subList.appendChild(subListItem);
                        });
                        listItem.appendChild(subList);
                    }
                    
                    navList.appendChild(listItem);
                    visibleNumber++;
                }
            });
        }
        
        // Renumber section headers on frontend
        function renumberFrontendSections() {
            let visibleNumber = 0; // Start at 0 for "00. Introduction"

            FRONTEND_SECTION_ORDER.forEach(section => {
                const isHidden = hiddenSections[section.id];
                if (!isHidden) {
                    const sectionElement = document.getElementById(section.id);
                    if (sectionElement) {
                        const h2 = sectionElement.querySelector('h2:not(.content-section-hero h2)');
                        const heroH2 = sectionElement.querySelector('.content-section-hero h2');

                        const numStr = String(visibleNumber).padStart(2, '0');
                        const nameStr = section.id === 'frame-rebel' ? brandName : section.name;
                        const headingHTML = `<span class="section-num">${numStr}.</span><span class="section-name">${nameStr}</span>`;

                        if (h2) {
                            h2.innerHTML = headingHTML;
                        }

                        if (heroH2) {
                            const buttonsContainer = heroH2.querySelector('.download-buttons-container, .font-download-buttons-container');
                            heroH2.innerHTML = headingHTML;
                            if (buttonsContainer) heroH2.appendChild(buttonsContainer);
                        }
                    }
                    visibleNumber++;
                }
            });
        }
        
        // Handle hidden sections
        if (content.hiddenSections) {
            Object.keys(content.hiddenSections).forEach(sectionId => {
                if (content.hiddenSections[sectionId]) {
                    const section = document.getElementById(sectionId);
                    if (section) {
                        section.style.display = 'none';
                    }
                }
            });
        }
        
        // Build navigation and renumber sections
        buildNavigation();
        renumberFrontendSections();
        
        // Initialize smooth scrolling (uses delegation, so only needs to be called once)
        initSmoothScrolling();
        
        // Re-initialize scroll spy after navigation is rebuilt
        setTimeout(() => {
            initScrollSpy();
            // Set initial active section on load
            const firstSection = document.querySelector('.content-section');
            if (firstSection) {
                const firstSectionId = firstSection.getAttribute('id');
                const firstNavItem = document.querySelector(`.nav-list > li .nav-link[data-section="${firstSectionId}"]`);
                if (firstNavItem && firstNavItem.parentElement) {
                    firstNavItem.classList.add('active');
                    firstNavItem.parentElement.classList.add('active-section', 'expanded');
                }
            }
        }, 100);
        
    } catch (error) {
        console.error('Error loading content:', error);
        console.error('Error details:', error.message, error.stack);
        const sidebarBrandName = document.getElementById('sidebar-brand-name');
        if (sidebarBrandName) sidebarBrandName.textContent = 'Error loading content';
        
        // Show error in main content area too
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div style="padding: 2rem; text-align: center;">
                    <h2>Error Loading Content</h2>
                    <p>${error.message || 'Unknown error occurred'}</p>
                    <p style="color: #999; font-size: 0.875rem;">Check the browser console for more details.</p>
                </div>
            `;
        }
    }
}

// Format content - convert newlines to paragraphs, handle subsections
function formatContent(text) {
    if (!text) return '<p>No content yet. Edit via admin panel.</p>';
    
    const lines = text.trim().split('\n').filter(line => line.trim());
    let html = '';
    let currentSubsection = null;
    let currentContent = [];
    
    lines.forEach((line, index) => {
        const trimmed = line.trim();
        
        // Check if line is a subsection header (e.g., "01.1 Our Proposition:" or "01.1 Our Proposition")
        const subsectionMatch = trimmed.match(/^(\d+\.\d+)\s+(.+?)(:)?$/);
        if (subsectionMatch) {
            // Close previous subsection if any
            if (currentSubsection) {
                html += renderSubsection(currentSubsection, currentContent);
            }
            // Start new subsection
            currentSubsection = {
                number: subsectionMatch[1],
                title: subsectionMatch[2]
            };
            currentContent = [];
        } else {
            // Regular content line
            currentContent.push(trimmed);
        }
    });
    
    // Close last subsection if any
    if (currentSubsection) {
        html += renderSubsection(currentSubsection, currentContent);
    } else if (currentContent.length > 0) {
        // No subsections, just render as paragraphs
        currentContent.forEach(line => {
            if (line.trim()) {
                // Apply markdown bold parsing
                const processedLine = parseMarkdownBold(line.trim());
                html += `<p>${processedLine}</p>`;
            }
        });
    }
    
    return html;
}

// Render a subsection
function renderSubsection(subsection, content) {
    let html = '<div class="subsection">';
    html += `<div class="subsection-number">${subsection.number}</div>`;
    html += `<div class="subsection-title">${subsection.title}</div>`;
    html += '<div class="subsection-content">';
    content.forEach(line => {
        if (line.trim()) {
            // Apply markdown bold parsing
            const processedLine = parseMarkdownBold(line.trim());
            html += `<p>${processedLine}</p>`;
        }
    });
    html += '</div></div>';
    return html;
}

// Initialize smooth scrolling for navigation links using event delegation
let smoothScrollingInitialized = false;
function initSmoothScrolling() {
    // Use event delegation to avoid duplicate listeners when navigation is rebuilt
    if (smoothScrollingInitialized) return;
    
    // Use event delegation on the sidebar-nav container (which exists in HTML)
    // This works even when the navigation list is rebuilt via innerHTML
    const sidebarNav = document.querySelector('.sidebar-nav');
    if (!sidebarNav) {
        // If sidebar nav doesn't exist yet, try again later
        setTimeout(initSmoothScrolling, 100);
        return;
    }
    
    sidebarNav.addEventListener('click', function(e) {
        const link = e.target.closest('.nav-link');
        if (!link) return;
        
        e.preventDefault();
        
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
            const targetId = href.substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                // Get absolute position of element
                let elementTop = 0;
                let element = targetElement;
                do {
                    elementTop += element.offsetTop;
                    element = element.offsetParent;
                } while (element);
                
                // Calculate scroll position with offset for header
                const headerOffset = 100;
                const scrollPosition = elementTop - headerOffset;
                
                // Scroll smoothly
                window.scrollTo({
                    top: Math.max(0, scrollPosition),
                    behavior: 'smooth'
                });
            }
        }
    });
    
    smoothScrollingInitialized = true;
}

// Scroll spy to highlight active navigation item
let scrollSpyInitialized = false;
let scrollSpyUpdateFunction = null;

function initScrollSpy() {
    // Remove old scroll listener if it exists
    if (scrollSpyUpdateFunction) {
        window.removeEventListener('scroll', scrollSpyUpdateFunction);
        scrollSpyUpdateFunction = null;
    }
    
    const sections = document.querySelectorAll('.content-section');
    const navLinks = document.querySelectorAll('.nav-link:not(.subsection-link)');
    const subsectionLinks = document.querySelectorAll('.nav-link.subsection-link');
    const navListItems = document.querySelectorAll('.nav-list > li');
    
    let currentActiveSection = '';
    let currentActiveSubsection = '';
    
    function updateActiveNav() {
        let current = '';
        let currentSubsection = '';
        const scrollY = window.pageYOffset || window.scrollY;
        
        // First check for subsections (more specific)
        const allSubsections = document.querySelectorAll('.subsection[id]');
        allSubsections.forEach(subsection => {
            // Calculate absolute position relative to document
            let subsectionTop = 0;
            let element = subsection;
            do {
                subsectionTop += element.offsetTop;
                element = element.offsetParent;
            } while (element);
            
            const subsectionHeight = subsection.offsetHeight;
            const subsectionId = subsection.getAttribute('id');
            
            // Check if we're in this subsection (with some offset)
            if (scrollY >= subsectionTop - 250 && scrollY < subsectionTop + subsectionHeight - 250) {
                currentSubsection = subsectionId;
                // Also set the parent section
                const parentSection = subsection.closest('.content-section');
                if (parentSection) {
                    current = parentSection.getAttribute('id');
                }
            }
        });
        
        // If no subsection found, check main sections
        if (!current) {
            sections.forEach(section => {
                // Calculate absolute position relative to document
                let sectionTop = 0;
                let element = section;
                do {
                    sectionTop += element.offsetTop;
                    element = element.offsetParent;
                } while (element);
                
                const sectionHeight = section.offsetHeight;
                const sectionId = section.getAttribute('id');
                
                // Check if we're in this section (with some offset)
                if (scrollY >= sectionTop - 200 && scrollY < sectionTop + sectionHeight - 200) {
                    current = sectionId;
                }
            });
        }
        
        // Only update if section or subsection changed
        if (current === currentActiveSection && currentSubsection === currentActiveSubsection) {
            return;
        }
        currentActiveSection = current;
        currentActiveSubsection = currentSubsection;
        
        // Update nav links - only main headings, not subsections
        navLinks.forEach(link => {
            if (link.classList.contains('subsection-link')) {
                link.classList.remove('active');
                return;
            }
            
            const linkSection = link.getAttribute('data-section');
            if (linkSection === current) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
        
        // Update subsection links - remove active class (subsections should never be active)
        subsectionLinks.forEach(link => {
            link.classList.remove('active');
        });
        
        // Expand/collapse subsections based on active section
        navListItems.forEach(listItem => {
            const mainLink = listItem.querySelector('.nav-link:not(.subsection-link)');
            if (!mainLink) return;
            
            const linkSection = mainLink.getAttribute('data-section');
            const subsectionList = listItem.querySelector('ul');
            
            // Only handle expand/collapse if this section has subsections
            if (subsectionList) {
                if (linkSection === current) {
                    // Expand this section's subsections
                    listItem.classList.add('active-section', 'expanded');
                } else {
                    // Collapse this section's subsections
                    listItem.classList.remove('active-section', 'expanded');
                }
            }
        });
    }
    
    // Throttle scroll events with passive listener for better performance
    let ticking = false;
    
    function handleScroll() {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                updateActiveNav();
                ticking = false;
            });
            ticking = true;
        }
    }
    
    // Store the handler so we can remove it later
    scrollSpyUpdateFunction = handleScroll;
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial check with a small delay to ensure DOM is ready
    setTimeout(() => {
        updateActiveNav();
    }, 100);
}

// Setup usage tabs for logo section
function setupUsageTabs() {
    document.querySelectorAll('.usage-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            
            // Remove active from all tabs and content
            document.querySelectorAll('.usage-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.usage-tab-content').forEach(c => c.classList.remove('active'));
            
            // Add active to clicked tab and corresponding content
            this.classList.add('active');
            const content = document.querySelector(`.usage-tab-content[data-content="${tabName}"]`);
            if (content) {
                content.classList.add('active');
            }
        });
    });
}

// Typography preview functions
let currentDevice = 'desktop';

// Cache typography data to avoid re-fetching
let cachedTypographyData = null;
let cachedContentData = null;
let uppercaseEnabled = false;

function toggleUppercase() {
    uppercaseEnabled = !uppercaseEnabled;
    const toggleBtn = document.getElementById('uppercase-toggle');
    const toggleText = document.getElementById('uppercase-toggle-text');
    
    if (toggleBtn) {
        if (uppercaseEnabled) {
            toggleBtn.classList.add('active');
            if (toggleText) toggleText.textContent = 'Uppercase (ON)';
        } else {
            toggleBtn.classList.remove('active');
            if (toggleText) toggleText.textContent = 'Uppercase';
        }
    }
    
    // Re-render preview with updated uppercase state
    if (cachedTypographyData) {
        renderTypographyPreview(cachedTypographyData, cachedContentData);
    } else {
        loadTypographyPreview();
    }
}

function switchDevice(device) {
    currentDevice = device;
    
    // Update button states
    document.querySelectorAll('.device-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.device === device) {
            btn.classList.add('active');
        }
    });
    
    // Update preview instantly using cached data
    if (cachedTypographyData) {
        renderTypographyPreview(cachedTypographyData, cachedContentData);
    } else {
        // If no cache, load it first
        loadTypographyPreview();
    }
}

async function loadTypographyPreview() {
    try {
        const response = await fetch('/api/typography');
        if (!response.ok) {
            throw new Error('Failed to load typography data');
        }
        const typographyData = await response.json();
        cachedTypographyData = typographyData;
        
        // Also cache content data
        try {
            const contentResponse = await fetch('/api/content');
            if (contentResponse.ok) {
                cachedContentData = await contentResponse.json();
            }
        } catch (error) {
            console.error('Error loading content for typography preview:', error);
        }
        
        await renderTypographyPreview(typographyData, cachedContentData);
    } catch (error) {
        console.error('Error loading typography preview:', error);
    }
}

async function renderTypographyPreview(typographyData, contentData = null) {
    const previewArea = document.getElementById('typography-preview');
    if (!previewArea) return;

    let primaryFontName = '';

    if (contentData) {
        primaryFontName = contentData.typography?.primary || '';
    } else {
        try {
            const contentResponse = await fetch('/api/content');
            if (contentResponse.ok) {
                const content = await contentResponse.json();
                cachedContentData = content;
                primaryFontName = content.typography?.primary || '';
            }
        } catch (error) {
            console.error('Error loading content for typography preview:', error);
        }
    }

    if (primaryFontName) loadGoogleFontIfNeeded(primaryFontName);

    const showcase = typographyData.showcase || {};
    const fontName = showcase.fontName || primaryFontName || 'Sans-Serif';
    const description = showcase.description || '';
    const weights = showcase.weights || [
        { name: 'Light', weight: 300, style: 'normal' },
        { name: 'Regular', weight: 400, style: 'normal' },
        { name: 'Bold', weight: 700, style: 'normal' }
    ];
    const hierarchy = showcase.hierarchy || [
        { role: 'HEADER', weight: 700, style: 'normal',
          sizes: { desktop: '60px', tablet: '48px', mobile: '36px' },
          lineHeight: '110%', letterSpacing: '-0.01em',
          sample: 'The Quick Brown Fox Jumps Over The Lazy Dog' },
        { role: 'BODY TEXT', weight: 300, style: 'normal',
          sizes: { desktop: '16px', tablet: '15px', mobile: '14px' },
          lineHeight: '155%', letterSpacing: '0',
          sample: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' }
    ];

    const device = currentDevice || 'desktop';

    // Full character set for showcase
    const charSet = 'Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz';
    const figures = '0 1 2 3 4 5 6 7 8 9  !  ?  &';

    // Build weight rows HTML
    const weightRowsHTML = weights.map((w, i) => `
        <div class="typo-weight-row" style="--row-bg: ${i % 2 === 0 ? '#1A1A1A' : '#111'}">
            <div class="typo-weight-label">
                <span class="typo-weight-fontname">${fontName.toUpperCase()}</span>
                <span class="typo-weight-name">${w.name}</span>
            </div>
            <div class="typo-weight-specimen" style="font-family:'${fontName}',sans-serif;font-weight:${w.weight};font-style:${w.style};">
                AaBbCcDd
            </div>
        </div>
    `).join('');

    // Build hierarchy table rows HTML
    const hierarchyRowsHTML = hierarchy.map((h, i) => {
        const fontSize = h.sizes?.[device] || h.sizes?.desktop || '16px';
        const specs = `${fontName}, ${fontSize}, ${h.lineHeight}`;
        return `
        <div class="typo-hierarchy-row" data-row="${i}">
            <div class="typo-hier-role">${h.role}</div>
            <div class="typo-hier-specs">${specs}</div>
            <div class="typo-hier-sample"
                 contenteditable="true"
                 spellcheck="false"
                 data-placeholder="${h.sample}"
                 style="font-family:'${fontName}',sans-serif;font-weight:${h.weight};font-style:${h.style};font-size:${fontSize};line-height:${h.lineHeight};letter-spacing:${h.letterSpacing};"
            >${h.sample}</div>
        </div>`;
    }).join('');

    previewArea.innerHTML = `
        <!-- Font Showcase Panel -->
        <div class="typo-showcase">
            <div class="typo-showcase-meta">
                <span class="typo-showcase-fontname">${fontName.toUpperCase()}</span>
                ${description ? `<p class="typo-showcase-desc">${description.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').split('\n\n')[0]}</p>` : ''}
            </div>
            <div class="typo-showcase-specimen">
                <div class="typo-showcase-aa" style="font-family:'${fontName}',sans-serif;">Aa</div>
                <div class="typo-showcase-charset" style="font-family:'${fontName}',sans-serif;">${charSet}</div>
                <div class="typo-showcase-figures" style="font-family:'${fontName}',sans-serif;">${figures}</div>
            </div>
        </div>

        <!-- Font Weight Rows -->
        <div class="typo-weights">
            ${weightRowsHTML}
        </div>

        <!-- Typography Hierarchy Table -->
        <div class="typo-hierarchy">
            <div class="typo-hierarchy-header">
                <span>Style</span>
                <span>Specs</span>
                <span>Example — click to type</span>
            </div>
            ${hierarchyRowsHTML}
        </div>
    `;

    previewArea.setAttribute('data-device', device);
}

// Toggle uppercase for a specific section
function toggleSectionUppercase(section) {
    const previewArea = document.getElementById('typography-preview');
    if (!previewArea) return;
    
    // Initialize if needed
    if (!previewArea.uppercaseStates) {
        previewArea.uppercaseStates = {
            display: false,
            heading: false,
            body: false,
            button: false,
            tag: false,
            caption: false
        };
    }
    
    // Toggle the state for this section
    previewArea.uppercaseStates[section] = !previewArea.uppercaseStates[section];
    
    // Re-render preview with updated state
    if (cachedTypographyData) {
        renderTypographyPreview(cachedTypographyData, cachedContentData);
    } else {
        loadTypographyPreview();
    }
}

// Make it available globally
window.toggleSectionUppercase = toggleSectionUppercase;

// List of common Google Fonts to check against
const GOOGLE_FONTS = [
    'Work Sans', 'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 'Raleway',
    'Merriweather', 'Playfair Display', 'Lora', 'Noto Serif', 'PT Serif', 'Source Serif Pro',
    'Fira Sans', 'Ubuntu', 'Poppins', 'Nunito', 'Quicksand', 'Rubik', 'Karla', 'Cabin',
    'Libre Franklin', 'Space Mono', 'IBM Plex Sans', 'DM Sans', 'Public Sans', 'Manrope',
    'Outfit', 'Plus Jakarta Sans', 'Lexend', 'Sora', 'Urbanist', 'Epilogue', 'Inter Tight',
    'Figtree', 'Onest', 'Geist Sans', 'General Sans', 'Neue Haas Grotesk Display Pro', 'Favorit'
];

// Function to dynamically load Google Fonts if needed
function loadGoogleFontIfNeeded(fontFamily) {
    if (!fontFamily || !GOOGLE_FONTS.includes(fontFamily)) {
        return; // Not a recognized Google Font or already loaded
    }

    // Check if the font is already in the document head
    const existingLink = document.querySelector(`link[href*="family=${encodeURIComponent(fontFamily)}"]`);
    if (existingLink) {
        return; // Font already linked
    }

    // Create a new link element for the Google Font
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,300;1,400;1,700&display=swap`;
    document.head.appendChild(link);
    console.log(`Dynamically loaded Google Font: ${fontFamily}`);
}

// Render color palette HTML
// Helper function to convert HEX to RGB
function hexToRgb(hex) {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return { r, g, b };
}

// Helper function to convert RGB to CMYK
function rgbToCmyk(r, g, b) {
    r = r / 255;
    g = g / 255;
    b = b / 255;
    
    const k = 1 - Math.max(r, g, b);
    const c = k === 1 ? 0 : (1 - r - k) / (1 - k);
    const m = k === 1 ? 0 : (1 - g - k) / (1 - k);
    const y = k === 1 ? 0 : (1 - b - k) / (1 - k);
    
    return {
        c: Math.round(c * 100),
        m: Math.round(m * 100),
        y: Math.round(y * 100),
        k: Math.round(k * 100)
    };
}

// Helper function to calculate luminance and determine text color
function getTextColorForBackground(hex) {
    const rgb = hexToRgb(hex);
    // Calculate relative luminance (0-1)
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    // Return black for light backgrounds, white for dark backgrounds
    return luminance > 0.5 ? '#000000' : '#ffffff';
}

// Apply color to SVG by setting fill and stroke attributes using string manipulation
function applyColorToSVG(svgString, color) {
    if (!svgString || !svgString.trim().startsWith('<svg')) {
        return svgString;
    }
    
    let modifiedSVG = svgString;
    
    // Replace fill attributes in SVG elements, but preserve fill="none"
    // Match fill="..." or fill='...' and replace with the new color, but skip fill="none" or fill='none'
    modifiedSVG = modifiedSVG.replace(/fill="(?!none)[^"]*"/gi, `fill="${color}"`);
    modifiedSVG = modifiedSVG.replace(/fill='(?!none)[^']*'/gi, `fill='${color}'`);
    
    // Also replace stroke attributes if they exist and aren't "none"
    modifiedSVG = modifiedSVG.replace(/stroke="(?!none)[^"]*"/gi, `stroke="${color}"`);
    modifiedSVG = modifiedSVG.replace(/stroke='(?!none)[^']*'/gi, `stroke='${color}'`);
    
    // Add fill attribute to elements that don't have one (path, circle, rect, ellipse, polygon, polyline, line, text, g)
    // Match opening tags without fill attribute and add fill
    const svgElements = ['path', 'circle', 'rect', 'ellipse', 'polygon', 'polyline', 'line', 'text', 'g'];
    svgElements.forEach(element => {
        // Match <element  or <element> without fill attribute and add fill
        const regex = new RegExp(`<${element}(?![^>]*\\bfill\\s*=)([^>]*)>`, 'gi');
        modifiedSVG = modifiedSVG.replace(regex, `<${element}$1 fill="${color}">`);
    });
    
    return modifiedSVG;
}

// Generate DO NOT examples from SVG logo
function generateDoNotExamples(logoSVG, brandName) {
    if (!logoSVG) return '';
    
    // Extract text content from SVG for the "Re-create" example
    // Try to find text elements or use brand name as fallback
    let logoText = brandName || 'LOGO';
    try {
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(logoSVG, 'image/svg+xml');
        const textElements = svgDoc.querySelectorAll('text, tspan');
        if (textElements.length > 0) {
            logoText = Array.from(textElements).map(el => el.textContent).join(' ').trim() || brandName || 'LOGO';
        }
    } catch (e) {
        // Use brand name if parsing fails
        logoText = brandName || 'LOGO';
    }
    
    // Create SVG with outline (fill: none, stroke: black)
    function createOutlineSVG(svgString) {
        let outlineSVG = svgString;
        // Replace all fill attributes with fill="none" (but preserve fill="none" if already there)
        outlineSVG = outlineSVG.replace(/fill="(?!none)[^"]*"/gi, 'fill="none"');
        outlineSVG = outlineSVG.replace(/fill='(?!none)[^']*'/gi, "fill='none'");
        // Add or replace stroke="black" to all relevant SVG elements (path, circle, rect, ellipse, polygon, polyline, text)
        const svgElements = ['path', 'circle', 'rect', 'ellipse', 'polygon', 'polyline', 'text'];
        svgElements.forEach(element => {
            outlineSVG = outlineSVG.replace(new RegExp(`<${element}([^>]*?)>`, 'gi'), (match, attrs) => {
                if (!attrs.includes('stroke')) {
                    return `<${element}${attrs} stroke="black" stroke-width="1">`;
                }
                return match.replace(/stroke="[^"]*"/gi, 'stroke="black"').replace(/stroke='[^']*'/gi, "stroke='black'");
            });
        });
        return outlineSVG;
    }
    
    // Create SVG with custom fill color
    function createColoredSVG(svgString, color) {
        return applyColorToSVG(svgString, color);
    }
    
    // Ensure SVG has proper dimensions if missing
    function ensureSVGDimensions(svgString) {
        if (!svgString || !svgString.trim().startsWith('<svg')) {
            return svgString;
        }
        
        // Check if SVG has width and height attributes
        if (!svgString.includes('width=') || !svgString.includes('height=')) {
            // Try to extract viewBox if available
            const viewBoxMatch = svgString.match(/viewBox=["']([^"']+)["']/);
            if (viewBoxMatch) {
                const viewBoxValues = viewBoxMatch[1].split(/\s+/);
                if (viewBoxValues.length >= 4) {
                    const width = viewBoxValues[2];
                    const height = viewBoxValues[3];
                    // Add width and height if not present
                    svgString = svgString.replace(/<svg([^>]*)>/, `<svg$1 width="${width}" height="${height}">`);
                }
            } else {
                // Default dimensions if no viewBox
                svgString = svgString.replace(/<svg([^>]*)>/, `<svg$1 width="200" height="50">`);
            }
        }
        
        return svgString;
    }
    
    // Ensure SVG has a visible fill color (default to black if all fills are white/transparent)
    function ensureVisibleFill(svgString) {
        if (!svgString || !svgString.trim().startsWith('<svg')) {
            return svgString;
        }
        
        // Check if SVG has any visible fills (not white, not none, not transparent)
        const hasVisibleFill = /fill="(?!none|white|#fff|#ffffff|transparent|rgba?\([^)]*0[^)]*\))[^"]*"/i.test(svgString);
        
        // If no visible fills found, add a default black fill to paths
        if (!hasVisibleFill) {
            // Add fill="black" to paths that don't have fill or have fill="white"/fill="none"
            svgString = svgString.replace(/<path([^>]*?)(?:fill="(?:none|white|#fff|#ffffff)"|fill='(?:none|white|#fff|#ffffff)')?([^>]*?)>/gi, (match, before, fill, after) => {
                if (!fill) {
                    return `<path${before}${after} fill="black">`;
                }
                return match.replace(/fill="(?:none|white|#fff|#ffffff)"/gi, 'fill="black"').replace(/fill='(?:none|white|#fff|#ffffff)'/gi, "fill='black'");
            });
        }
        
        return svgString;
    }
    
    // Process the base SVG to ensure it's properly formatted and visible
    let processedSVG = ensureSVGDimensions(logoSVG);
    processedSVG = ensureVisibleFill(processedSVG);
    
    const doNotExamples = [
        {
            instruction: 'DO NOT CROP THE LOGO',
            html: `<div class="do-not-example">
                <div class="do-not-instruction">DO NOT CROP THE LOGO</div>
                <div class="do-not-logo-container do-not-crop">${processedSVG}</div>
            </div>`
        },
        {
            instruction: 'DO NOT DISTORT THE LOGO',
            html: `<div class="do-not-example">
                <div class="do-not-instruction">DO NOT DISTORT THE LOGO</div>
                <div class="do-not-logo-container do-not-distort">${processedSVG}</div>
            </div>`
        },
        {
            instruction: 'DO NOT CHANGE THE TRANSPARENCY OF THE LOGO',
            html: `<div class="do-not-example">
                <div class="do-not-instruction">DO NOT CHANGE THE TRANSPARENCY OF THE LOGO</div>
                <div class="do-not-logo-container do-not-transparency">${processedSVG}</div>
            </div>`
        },
        {
            instruction: 'DO NOT USE DROP SHADOWS OR ANY OTHER EFFECTS',
            html: `<div class="do-not-example">
                <div class="do-not-instruction">DO NOT USE DROP SHADOWS OR ANY OTHER EFFECTS</div>
                <div class="do-not-logo-container do-not-shadow">${processedSVG}</div>
            </div>`
        },
        {
            instruction: 'DO NOT USE DIFFERENT COLORS',
            html: `<div class="do-not-example">
                <div class="do-not-instruction">DO NOT USE DIFFERENT COLORS</div>
                <div class="do-not-logo-container do-not-color">${createColoredSVG(processedSVG, '#eec258')}</div>
            </div>`
        },
        {
            instruction: 'DO NOT OUTLINE LOGOTYPE',
            html: `<div class="do-not-example">
                <div class="do-not-instruction">DO NOT OUTLINE LOGOTYPE</div>
                <div class="do-not-logo-container do-not-outline">${createOutlineSVG(processedSVG)}</div>
            </div>`
        },
        {
            instruction: 'DO NOT SHUFFLE AROUND THE LOGO',
            html: `<div class="do-not-example">
                <div class="do-not-instruction">DO NOT SHUFFLE AROUND THE LOGO</div>
                <div class="do-not-logo-container do-not-shuffle">${processedSVG}</div>
            </div>`
        },
        {
            instruction: 'DO NOT RE-CREATE USING ANY OTHER TYPEFACE',
            html: `<div class="do-not-example">
                <div class="do-not-instruction">DO NOT RE-CREATE USING ANY OTHER TYPEFACE</div>
                <div class="do-not-logo-container do-not-recreate"><div class="do-not-text-recreate">${logoText}</div></div>
            </div>`
        },
        {
            instruction: 'DO NOT ADD NEW GRAPHIC ELEMENTS TO THE LOGO.',
            html: `<div class="do-not-example">
                <div class="do-not-instruction">DO NOT ADD NEW GRAPHIC ELEMENTS TO THE LOGO.</div>
                <div class="do-not-logo-container do-not-graphic">
                    ${processedSVG}
                    <div class="do-not-graphic-element"></div>
                </div>
            </div>`
        },
        {
            instruction: 'DO NOT ROTATE ANY PART OF THE LOGO',
            html: `<div class="do-not-example">
                <div class="do-not-instruction">DO NOT ROTATE ANY PART OF THE LOGO</div>
                <div class="do-not-logo-container do-not-rotate">${processedSVG}</div>
            </div>`
        }
    ];
    
    let html = '<div class="do-not-grid">';
    doNotExamples.forEach(example => {
        html += example.html;
    });
    html += '</div>';
    
    return html;
}

// Generate incorrect color examples - colors that are NOT in the brand palette or have poor contrast
function generateIncorrectColorExamples(brandColors) {
    const incorrectColors = [];
    const brandHexes = brandColors ? brandColors.map(c => c.hex?.toLowerCase()) : [];
    
    // Common "wrong" colors that are typically not in brand palettes
    const wrongColors = [
        '#FF0000', // Bright red
        '#00FF00', // Bright green  
        '#0000FF', // Bright blue
        '#FFFF00', // Bright yellow
        '#FF00FF', // Bright magenta
        '#00FFFF', // Bright cyan
        '#FFA500', // Orange
        '#800080', // Purple
        '#FFC0CB', // Pink
        '#A52A2A', // Brown
        '#808080', // Gray (neutral, not brand-specific)
        '#C0C0C0', // Silver
    ];
    
    // Filter out any colors that might accidentally be in brand palette
    wrongColors.forEach(color => {
        if (!brandHexes.includes(color.toLowerCase())) {
            incorrectColors.push(color);
        }
    });
    
    // If we need more examples, generate random colors
    while (incorrectColors.length < 8) {
        const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
        if (!brandHexes.includes(randomColor.toLowerCase())) {
            incorrectColors.push(randomColor);
        }
    }
    
    // Return up to 8 incorrect examples
    return incorrectColors.slice(0, 8);
}

function renderColorPalette(colors) {
    // Group colors by type for layout
    const primaryColors = colors.filter(c => c.type === 'primary');
    const secondaryColors = colors.filter(c => c.type === 'secondary');
    const allColors = [...primaryColors, ...secondaryColors];
    
    return `
        <div class="color-palette-container">
            <div class="color-grid" id="color-grid">
                ${allColors.map((color, index) => {
                    // First color always spans full width
                    const isFirst = index === 0;
                    // After first color, use pairs (2 columns)
                    const spanFull = isFirst;
                    
                    // Convert HEX to RGB and CMYK
                    const rgb = hexToRgb(color.hex);
                    const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);
                    const rgbString = `${rgb.r}, ${rgb.g}, ${rgb.b}`;
                    const cmykString = `${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%`;
                    
                    // Determine text color based on background
                    const textColor = getTextColorForBackground(color.hex);
                    
                    const colorId = `color-${index}`;
                    
                    const isLightBg = textColor === '#000000';
                    const overlayColor = isLightBg ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)';
                    
                    return `
                        <div class="color-item-wrapper ${spanFull ? 'color-item-full' : ''}">
                            <div class="color-item ${isLightBg ? 'light-bg' : 'dark-bg'}" style="background-color: ${color.hex}; color: ${textColor};" id="${colorId}" data-text-color="${textColor}">
                                <span class="color-type-label ${color.type}" style="color: ${textColor}; opacity: 0.7;">${color.type}</span>
                                <div class="color-item-content">
                                    <div class="color-info">
                                        <span class="color-name" style="color: ${textColor};">${color.name}</span>
                                        <div class="color-value-display" style="color: ${textColor};">
                                            <span class="color-value-text" data-hex="${color.hex}" data-rgb="${rgbString}" data-cmyk="${cmykString}">${color.hex}</span>
                                        </div>
                                    </div>
                                    <div class="color-format-switcher">
                                        <button class="format-btn active" data-format="hex" data-color-id="${colorId}" onclick="switchColorFormat('${colorId}', 'hex')" style="color: ${textColor}; border-color: ${textColor};">HEX</button>
                                        <button class="format-btn" data-format="rgb" data-color-id="${colorId}" onclick="switchColorFormat('${colorId}', 'rgb')" style="color: ${textColor}; border-color: ${textColor};">RGB</button>
                                        <button class="format-btn" data-format="cmyk" data-color-id="${colorId}" onclick="switchColorFormat('${colorId}', 'cmyk')" style="color: ${textColor}; border-color: ${textColor};">CMYK</button>
                                    </div>
                                </div>
                                <button class="color-copy-btn" onclick="copyColorValue('${colorId}')" title="Copy color value" style="color: ${textColor};">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M5.5 3.5H3.5C2.94772 3.5 2.5 3.94772 2.5 4.5V12.5C2.5 13.0523 2.94772 13.5 3.5 13.5H11.5C12.0523 13.5 12.5 13.0523 12.5 12.5V10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                        <path d="M6.5 2.5H13.5C14.0523 2.5 14.5 2.94772 14.5 3.5V10.5C14.5 11.0523 14.0523 11.5 13.5 11.5H12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

// Function to switch color format - Attached to window for global access
function switchColorFormat(colorId, format) {
    const colorItem = document.getElementById(colorId);
    if (!colorItem) return;
    
    const valueText = colorItem.querySelector('.color-value-text');
    const formatBtns = colorItem.querySelectorAll('.format-btn');
    
    if (!valueText) return;
    
    // Remove active class from all buttons
    formatBtns.forEach(btn => btn.classList.remove('active'));
    
    // Add active class to clicked button
    const activeBtn = colorItem.querySelector(`.format-btn[data-format="${format}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    
    // Update displayed value
    if (format === 'hex') {
        valueText.textContent = valueText.getAttribute('data-hex');
    } else if (format === 'rgb') {
        valueText.textContent = valueText.getAttribute('data-rgb');
    } else if (format === 'cmyk') {
        valueText.textContent = valueText.getAttribute('data-cmyk');
    }
}
window.switchColorFormat = switchColorFormat;

// Function to copy current color value - Attached to window for global access
function copyColorValue(colorId) {
    const colorItem = document.getElementById(colorId);
    if (!colorItem) return;
    
    const activeBtn = colorItem.querySelector('.format-btn.active');
    const valueText = colorItem.querySelector('.color-value-text');
    
    if (!activeBtn || !valueText) return;
    
    const format = activeBtn.getAttribute('data-format');
    let valueToCopy = '';
    
    if (format === 'hex') {
        valueToCopy = valueText.getAttribute('data-hex');
    } else if (format === 'rgb') {
        valueToCopy = valueText.getAttribute('data-rgb');
    } else if (format === 'cmyk') {
        valueToCopy = valueText.getAttribute('data-cmyk');
    }
    
    if (valueToCopy) {
        copyToClipboard(valueToCopy);
    }
}
window.copyColorValue = copyColorValue;

// Copy to clipboard function - Attached to window for global access
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showCopyToast(text);
    }).catch(err => {
        // Fallback for older browsers
        const el = document.createElement('textarea');
        el.value = text;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        showCopyToast(text);
    });
}

function showCopyToast(value) {
    let toast = document.getElementById('copy-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'copy-toast';
        document.body.appendChild(toast);
    }
    toast.textContent = `Copied ${value}`;
    toast.classList.add('visible');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => toast.classList.remove('visible'), 2000);
}
window.copyToClipboard = copyToClipboard;

// Download image function
function downloadImage(imageSrc, filename) {
    // If it's a base64 data URL
    if (imageSrc.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = imageSrc;
        link.download = filename || 'image';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else {
        // If it's a URL, fetch and download
        fetch(imageSrc)
            .then(response => response.blob())
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename || 'image';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            })
            .catch(err => {
                console.error('Error downloading image:', err);
            });
    }
}

// Download font function
function downloadFont(fontPath, fontName) {
    const link = document.createElement('a');
    link.href = fontPath;
    link.download = fontName || 'font';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Add download button to section heading in hero
function addDownloadButtonToHeading(section, downloadUrl, buttonText = 'Download') {
    if (!section) return;
    
    // Find the h2 heading (either in hero or in section)
    let h2 = section.querySelector('.content-section-hero h2');
    if (!h2) {
        h2 = section.querySelector('h2');
    }
    if (!h2) return;
    
    // Ensure h2 has grid layout: num on top row, title + button on bottom row
    h2.style.display = 'grid';
    h2.style.gridTemplateColumns = '1fr auto';
    h2.style.gridTemplateRows = 'auto auto';
    h2.style.alignItems = 'end';
    h2.style.gap = '0';
    
    // Get existing button containers
    let buttonsContainer = h2.querySelector('.font-download-buttons-container');
    if (!buttonsContainer) {
        buttonsContainer = h2.querySelector('.download-buttons-container');
    }
    
    // If no container exists, create one
    if (!buttonsContainer) {
        // First, wrap the text content in a span if needed
        const existingContainers = h2.querySelectorAll('.download-buttons-container, .font-download-buttons-container');
        const hasTextWrapper = h2.querySelector('span:not(.download-buttons-container):not(.font-download-buttons-container)');
        
        if (!hasTextWrapper && h2.childNodes.length > 0) {
            // Collect all text nodes and non-container elements
            const textNodes = [];
            const walker = document.createTreeWalker(
                h2,
                NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
                {
                    acceptNode: function(node) {
                        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                            return NodeFilter.FILTER_ACCEPT;
                        }
                        if (node.nodeType === Node.ELEMENT_NODE && 
                            !node.classList.contains('download-buttons-container') && 
                            !node.classList.contains('font-download-buttons-container')) {
                            return NodeFilter.FILTER_ACCEPT;
                        }
                        return NodeFilter.FILTER_REJECT;
                    }
                }
            );
            
            let node;
            while (node = walker.nextNode()) {
                if (node.nodeType === Node.TEXT_NODE) {
                    textNodes.push(node);
                } else {
                    textNodes.push(node);
                }
            }
            
            // If we found content to wrap, wrap it
            if (textNodes.length > 0) {
                const textSpan = document.createElement('span');
                textSpan.style.flex = '1';
                
                // Move all non-container children to the span
                const children = Array.from(h2.childNodes);
                children.forEach(child => {
                    if (child.nodeType === Node.TEXT_NODE || 
                        (child.nodeType === Node.ELEMENT_NODE && 
                         !child.classList.contains('download-buttons-container') && 
                         !child.classList.contains('font-download-buttons-container'))) {
                        textSpan.appendChild(child);
                    }
                });
                
                // Clear h2 and add wrapped text first
                h2.innerHTML = '';
                h2.appendChild(textSpan);
            }
        }
        
        // Now create the button container
        buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'download-buttons-container';
        h2.appendChild(buttonsContainer);
    }
    
    // Check if button already exists
    const existingBtn = buttonsContainer.querySelector(`[data-download-url="${downloadUrl}"]`);
    if (existingBtn) return; // Button already exists
    
    // Create download button
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'download-asset-btn section-download-btn';
    downloadBtn.textContent = buttonText;
    if (downloadUrl) downloadBtn.setAttribute('data-download-url', downloadUrl);
    downloadBtn.title = downloadUrl ? buttonText : 'No download URL configured — add one in admin';
    if (!downloadUrl) {
        downloadBtn.disabled = true;
        downloadBtn.style.opacity = '0.35';
        downloadBtn.style.cursor = 'not-allowed';
    }

    // Add click handler
    downloadBtn.addEventListener('click', function() {
        const url = this.getAttribute('data-download-url');
        if (url) {
            if (url.startsWith('http://') || url.startsWith('https://')) {
                window.open(url, '_blank');
            } else {
                // For relative URLs, create a download link
                const a = document.createElement('a');
                a.href = url;
                a.download = '';
                a.target = '_blank';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
        }
    });
    
    // Add button to container (prepend so it appears first)
    buttonsContainer.insertBefore(downloadBtn, buttonsContainer.firstChild);
}

// Load fonts download buttons next to heading
async function loadFontsDownloadButtons() {
    try {
        const response = await fetch('/api/typography');
        if (!response.ok) {
            return;
        }
        const typographyData = await response.json();
        const fonts = typographyData.fonts || [];
        
        const typographySection = document.getElementById('typography');
        if (!typographySection) return;
        
        // Find the h2 heading (either in hero or in section)
        // Try hero h2 first, then any h2 in the section
        let h2 = typographySection.querySelector('.content-section-hero h2');
        if (!h2) {
            h2 = typographySection.querySelector('h2');
        }
        if (!h2) return;
        
        // Filter to only non-Google Fonts for download buttons
        const downloadFonts = fonts.filter(font => {
            const fontName = font.fontFamily || font.filename || 'Font';
            return !GOOGLE_FONTS.includes(fontName);
        });
        
        if (downloadFonts.length === 0) return;
        
        // Create a container for buttons if it doesn't exist
        let buttonsContainer = h2.querySelector('.font-download-buttons-container');
        if (!buttonsContainer) {
            buttonsContainer = document.createElement('div');
            buttonsContainer.className = 'font-download-buttons-container';
            h2.appendChild(buttonsContainer);
        }
        
        // Generate buttons HTML
        buttonsContainer.innerHTML = downloadFonts.map(font => {
            const fontName = font.fontFamily || font.filename || 'Font';
            const fontPath = font.path || `/fonts/${font.filename}`;
            const fontFilename = font.filename || fontName;
            const downloadUrl = font.downloadUrl || fontPath;
            return `<button class="download-asset-btn font-download-btn" data-font-url="${downloadUrl.replace(/"/g, '&quot;')}" data-font-filename="${fontFilename.replace(/"/g, '&quot;')}" title="Download ${fontName}">${fontName}</button>`;
        }).join('');
        
        // Setup download button event listeners
        buttonsContainer.querySelectorAll('.font-download-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const fontUrl = this.getAttribute('data-font-url');
                const fontFilename = this.getAttribute('data-font-filename') || 'font';
                // If it's a full URL, open in new tab, otherwise download
                if (fontUrl.startsWith('http://') || fontUrl.startsWith('https://')) {
                    window.open(fontUrl, '_blank');
                } else {
                    downloadFont(fontUrl, fontFilename);
                }
            });
        });
    } catch (error) {
        console.error('Error loading fonts download buttons:', error);
    }
}

// Load fonts download list (kept for backwards compatibility but hidden)
async function loadFontsDownloadList() {
    // Hide the fonts download section since we're using buttons in heading now
    const fontsDownloadSection = document.getElementById('fonts-download-section');
    if (fontsDownloadSection) {
        fontsDownloadSection.style.display = 'none';
    }
}

// Initialize usage tabs
function initUsageTabs() {
    const tabs = document.querySelectorAll('.usage-tab');
    const tabContents = document.querySelectorAll('.usage-tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const targetContent = document.querySelector(`.usage-tab-content[data-content="${targetTab}"]`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}

// Hide preloader function - ensures minimum 3 seconds display time
function hidePreloader() {
    const preloader = document.getElementById('preloader');
    const layout = document.querySelector('.layout');
    const preloaderStartTime = sessionStorage.getItem('preloaderStartTime');
    const now = Date.now();
    
    if (preloaderStartTime) {
        const elapsed = now - parseInt(preloaderStartTime);
        const minDisplayTime = 3000; // 3 seconds minimum
        const remainingTime = Math.max(0, minDisplayTime - elapsed);
        
        setTimeout(() => {
            if (preloader) {
                preloader.classList.add('hidden');
            }
            // Show layout content after preloader fades out
            setTimeout(() => {
                if (layout) {
                    layout.classList.add('loaded');
                }
            }, 300);
        }, remainingTime);
    } else {
        // Fallback: hide immediately if start time not found
        if (preloader) {
            preloader.classList.add('hidden');
        }
        setTimeout(() => {
            if (layout) {
                layout.classList.add('loaded');
            }
        }, 300);
    }
}

// Load content on page load
// Initialize Lenis smooth scroll
let lenis;

function initLenis() {
    if (typeof Lenis !== 'undefined') {
        lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            orientation: 'vertical',
            gestureOrientation: 'vertical',
            smoothWheel: true,
            wheelMultiplier: 1,
            smoothTouch: false,
            touchMultiplier: 2,
            infinite: false,
        });

        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }

        requestAnimationFrame(raf);
    }
}

// Initialize scroll-triggered animations
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                const element = entry.target;
                
                // Add fade-in animation
                element.classList.add('fade-in');
                
                // Add staggered delay for subsections
                const delayIndex = Array.from(element.parentElement?.children || []).indexOf(element) % 5;
                if (delayIndex > 0) {
                    element.classList.add(`fade-in-delay-${Math.min(delayIndex, 4)}`);
                }
                
                // Stop observing once animated
                observer.unobserve(element);
            }
        });
    }, observerOptions);

    // Observe all sections and subsections
    const sections = document.querySelectorAll('.content-section[data-animate-on-scroll="true"]');
    sections.forEach(section => {
        observer.observe(section);
    });

    // Observe text elements with very subtle fade-in
    const textElements = document.querySelectorAll('.subsection, .subsection-content, .subsection-title, .content-section-content p, .content-section-content h3, .content-section-content h4');
    textElements.forEach((element) => {
        element.style.opacity = '0';
        element.setAttribute('data-animate-on-scroll', 'true');
        observer.observe(element);
    });

    // Observe images separately (they'll get mask-up animation)
    const imageElements = document.querySelectorAll('.content-section-content img, .content-section-hero, .content-section-hero-image, .subsection img');
    imageElements.forEach((element) => {
        element.style.opacity = '0';
        element.style.backgroundColor = '#fff'; // White background for mask effect
        element.setAttribute('data-animate-on-scroll', 'true');
        observer.observe(element);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded, starting content load...');
    
    // Initialize Lenis smooth scroll
    initLenis();
    
    // Check if preloader was already shown in this session
    const preloaderShown = sessionStorage.getItem('preloaderShown');
    const preloader = document.getElementById('preloader');
    const layout = document.querySelector('.layout');
    
    if (preloaderShown === 'true') {
        // Skip preloader if already shown in this session
        if (preloader) {
            preloader.style.display = 'none';
        }
        if (layout) {
            layout.classList.add('loaded');
        }
    } else {
        // Mark preloader as shown and record start time
        sessionStorage.setItem('preloaderShown', 'true');
        sessionStorage.setItem('preloaderStartTime', Date.now().toString());
    }
    
    try {
        // Initialize smooth scrolling early (it will wait for nav to exist)
        initSmoothScrolling();
        loadContent().then(() => {
            console.log('Content loaded successfully');
            initUsageTabs();
            // Initialize scroll animations after content is loaded
            setTimeout(() => {
                initScrollAnimations();
            }, 100);
            // Hide preloader after content is loaded (respects minimum 3 seconds)
            hidePreloader();
        }).catch((error) => {
            console.error('Error in loadContent promise:', error);
            // Hide preloader even on error (respects minimum 3 seconds)
            hidePreloader();
        });
        loadTypographyPreview();
        
        // Initialize mobile menu
        initMobileMenu();
    } catch (error) {
        console.error('Error in DOMContentLoaded:', error);
        // Hide preloader on error (respects minimum 3 seconds)
        hidePreloader();
    }
});

// Initialize mobile menu functionality
function initMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    const body = document.body;
    
    if (mobileMenuBtn && sidebar) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
            body.classList.toggle('sidebar-open');
            const isOpen = sidebar.classList.contains('mobile-open');
            mobileMenuBtn.setAttribute('aria-expanded', isOpen);
        });
        
        // Close menu when clicking overlay
        const overlay = document.querySelector('.sidebar-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => {
                sidebar.classList.remove('mobile-open');
                body.classList.remove('sidebar-open');
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
            });
        }
        
        // Close menu when clicking a nav link
        const navLinks = sidebar.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                sidebar.classList.remove('mobile-open');
                body.classList.remove('sidebar-open');
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
            });
        });
    }
}
