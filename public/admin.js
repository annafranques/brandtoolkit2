let currentContent = {};
let originalContent = {}; // Store original content for change tracking
const changedSections = new Set(); // Track which sections have changed

// Check authentication
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/check', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (!data.authenticated) {
            window.location.href = '/login.html';
            return false;
        }
        return true;
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = '/login.html';
        return false;
    }
}

// Logout function
async function logout() {
    try {
        await fetch('/api/auth/logout', { 
            method: 'POST',
            credentials: 'include'
        });
        // Clear admin authentication session flag
        sessionStorage.removeItem('adminAuthenticated');
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Logout error:', error);
        // Clear admin authentication session flag even on error
        sessionStorage.removeItem('adminAuthenticated');
        window.location.href = '/login.html';
    }
}

// Load content
async function loadContent() {
    try {
        const response = await fetch('/api/content');
        currentContent = await response.json();
        // Deep clone for change tracking
        originalContent = JSON.parse(JSON.stringify(currentContent));
        changedSections.clear(); // Reset changed sections
        populateForm(currentContent);
        return currentContent;
    } catch (error) {
        console.error('Error loading content:', error);
        showStatus('Error loading content', 'error');
        return null;
    }
}

// Helper function to deep compare two values
function deepEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;
    if (typeof a !== 'object') return false;
    
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
        if (!keysB.includes(key)) return false;
        if (!deepEqual(a[key], b[key])) return false;
    }
    
    return true;
}

// Track changes to a section
function trackSectionChange(sectionPath) {
    changedSections.add(sectionPath);
}

// Check if a section has changed
function hasSectionChanged(sectionPath) {
    if (!originalContent) return true;
    
    const pathParts = sectionPath.split('.');
    let originalValue = originalContent;
    let currentValue = currentContent;
    
    for (const part of pathParts) {
        originalValue = originalValue?.[part];
        currentValue = currentValue?.[part];
    }
    
    return !deepEqual(originalValue, currentValue);
}

// Populate form with content - UPDATED FOR NEW STRUCTURE
function populateForm(content) {
    if (!content) {
        console.error('populateForm: content is null or undefined');
        return;
    }
    
    try {
        // Helper to safely set value - skip file inputs
        function setValueSafely(id, value) {
            try {
                const el = document.getElementById(id);
                if (!el) return;
                
                // Skip file inputs - they can't have their value set
                // Check if element has 'type' property before accessing it
                if (el.type && el.type === 'file') {
                    console.warn(`Skipping value assignment for file input: ${id}`);
                    return;
                }
                
                // Only set value if element has value property (inputs, textareas, etc.)
                if ('value' in el) {
                    el.value = value || '';
                }
            } catch (error) {
                console.warn(`Could not set value for ${id}:`, error.message);
            }
        }
        // Update brand name in sidebar
        const adminBrandName = document.getElementById('admin-brand-name');
        
        // Update brand name in logo section heading
        const logoBrandName = document.getElementById('admin-logo-brand-name');
        if (logoBrandName) {
            logoBrandName.textContent = content.brandName || 'DIRTT';
        }
        if (adminBrandName) {
            adminBrandName.textContent = content.brandName || 'DIRTT';
        }
    
    // Update brand name in frame-rebel section heading (will be handled by renumberSections)
    // Update brand name in frame-rebel navigation link (will be handled by renumberSections)
    
    // Basic info
    setValueSafely('brand-name', content.brandName || '');
    
    // Logo - set inline SVG code
    const logoInput = document.getElementById('logo-upload');
    if (content.logo && logoInput) {
        setValueSafely('logo-upload', content.logo);
        
        // Update preview
        const preview = document.getElementById('logo-preview');
        if (preview && content.logo.trim().startsWith('<svg')) {
            try {
                preview.innerHTML = `<div style="max-width: 200px; max-height: 200px; border: 1px solid #ddd; padding: 1rem; background: white;">${content.logo}</div>`;
            } catch (error) {
                console.warn('Could not set logo preview:', error.message);
            }
        }
    }
    
    // Setup logo preview on input change
    if (logoInput) {
        logoInput.addEventListener('input', function() {
            const preview = document.getElementById('logo-preview');
            if (preview && this.value.trim().startsWith('<svg')) {
                try {
                    preview.innerHTML = `<div style="max-width: 200px; max-height: 200px; border: 1px solid #ddd; padding: 1rem; background: white;">${this.value}</div>`;
                } catch (error) {
                    console.warn('Could not update logo preview:', error.message);
                }
            } else if (preview) {
                preview.innerHTML = '';
            }
        });
    }
    
    // 00. The Name of the Project - Hero Image
    if (content.frameRebel) {
        // Hero image for frameRebel section
        const frameRebelHeroInput = document.querySelector('[data-section="frameRebel"].section-hero-image-input');
        const frameRebelHeroPreview = document.getElementById('frame-rebel-hero-preview');
        if (content.frameRebel.image && frameRebelHeroPreview) {
            frameRebelHeroPreview.innerHTML = `
                <div style="position: relative; display: inline-block; margin-top: 1rem;">
                    <img src="${content.frameRebel.image}" alt="Preview" style="max-width: 100%; max-height: 300px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <button type="button" class="remove-image-btn" data-preview-id="frame-rebel-hero-preview" style="position: absolute; top: 8px; right: 8px; background: rgba(255, 0, 0, 0.8); color: white; border: none; border-radius: 50%; width: 28px; height: 28px; cursor: pointer; font-size: 16px; line-height: 1; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);" title="Remove image">×</button>
                </div>
            `;
            if (frameRebelHeroInput) {
                frameRebelHeroInput.setAttribute('data-image-url', content.frameRebel.image);
                const removeBtn = frameRebelHeroPreview.querySelector('.remove-image-btn');
                if (removeBtn) {
                    removeBtn.addEventListener('click', function() {
                        removeImage(frameRebelHeroInput, 'frame-rebel-hero-preview');
                    });
                }
            }
        }
        // About The Project - merge any existing introduction content
        const aboutEl = document.getElementById('frame-rebel-about-content');
        if (aboutEl && content.frameRebel.aboutTheProject) {
            if (typeof content.frameRebel.aboutTheProject === 'object') {
                setValueSafely('frame-rebel-about-content', content.frameRebel.aboutTheProject.content || '');
                const preview = document.getElementById('frame-rebel-about-preview');
                if (preview && content.frameRebel.aboutTheProject.image) {
                    const input = document.querySelector('[data-section="frameRebel"][data-subsection="aboutTheProject"]');
                    const inputId = input ? input.id || 'frame-rebel-about-input' : 'frame-rebel-about-input';
                    preview.innerHTML = `
                        <div style="position: relative; display: inline-block; margin-top: 1rem;">
                            <img src="${content.frameRebel.aboutTheProject.image}" alt="Preview" style="max-width: 100%; max-height: 300px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                            <button type="button" class="remove-image-btn" data-input-id="${inputId}" data-preview-id="frame-rebel-about-preview" style="position: absolute; top: 8px; right: 8px; background: rgba(255, 0, 0, 0.8); color: white; border: none; border-radius: 50%; width: 28px; height: 28px; cursor: pointer; font-size: 16px; line-height: 1; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);" title="Remove image">×</button>
                        </div>
                    `;
                    if (input) {
                        const removeBtn = preview.querySelector('.remove-image-btn');
                        if (removeBtn) {
                            removeBtn.addEventListener('click', function() {
                                removeImage(input, 'frame-rebel-about-preview');
                            });
                        }
                    }
                }
            } else {
                setValueSafely('frame-rebel-about-content', content.frameRebel.aboutTheProject || '');
            }
        } else if (aboutEl && content.introduction) {
            // If introduction still exists (during migration), merge it
            if (typeof content.introduction === 'object') {
                setValueSafely('frame-rebel-about-content', content.introduction.content || '');
                const preview = document.getElementById('frame-rebel-about-preview');
                if (preview && content.introduction.image) {
                    const input = document.querySelector('[data-section="frameRebel"][data-subsection="aboutTheProject"]');
                    preview.innerHTML = renderImagePreview(content.introduction.image, 'frame-rebel-about-preview', input);
                    const removeBtn = preview.querySelector('.remove-image-btn');
                    if (removeBtn && input) {
                        removeBtn.addEventListener('click', function() {
                            removeImage(input, 'frame-rebel-about-preview');
                        });
                    }
                }
            } else {
                setValueSafely('frame-rebel-about-content', content.introduction || '');
            }
        }
        
        // Fundamental Pillars
        const pillarsEl = document.getElementById('frame-rebel-pillars-content');
        if (pillarsEl && content.frameRebel.fundamentalPillars) {
            if (typeof content.frameRebel.fundamentalPillars === 'object') {
                setValueSafely('frame-rebel-pillars-content', content.frameRebel.fundamentalPillars.content || '');
                const preview = document.getElementById('frame-rebel-pillars-preview');
                if (preview && content.frameRebel.fundamentalPillars.image) {
                    const input = document.querySelector('[data-section="frameRebel"][data-subsection="fundamentalPillars"]');
                    const inputId = input ? input.id || 'frame-rebel-pillars-input' : 'frame-rebel-pillars-input';
                    preview.innerHTML = `
                        <div style="position: relative; display: inline-block; margin-top: 1rem;">
                            <img src="${content.frameRebel.fundamentalPillars.image}" alt="Preview" style="max-width: 100%; max-height: 300px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                            <button type="button" class="remove-image-btn" data-input-id="${inputId}" data-preview-id="frame-rebel-pillars-preview" style="position: absolute; top: 8px; right: 8px; background: rgba(255, 0, 0, 0.8); color: white; border: none; border-radius: 50%; width: 28px; height: 28px; cursor: pointer; font-size: 16px; line-height: 1; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);" title="Remove image">×</button>
                        </div>
                    `;
                    if (input) {
                        const removeBtn = preview.querySelector('.remove-image-btn');
                        if (removeBtn) {
                            removeBtn.addEventListener('click', function() {
                                removeImage(input, 'frame-rebel-pillars-preview');
                            });
                        }
                    }
                }
            } else {
                setValueSafely('frame-rebel-pillars-content', content.frameRebel.fundamentalPillars || '');
            }
        }
        
        // Tone of Voice
        const toneEl = document.getElementById('frame-rebel-tone-content');
        if (toneEl && content.frameRebel.toneOfVoice) {
            if (typeof content.frameRebel.toneOfVoice === 'object') {
                setValueSafely('frame-rebel-tone-content', content.frameRebel.toneOfVoice.content || '');
                const preview = document.getElementById('frame-rebel-tone-preview');
                if (preview && content.frameRebel.toneOfVoice.image) {
                    const input = document.querySelector('[data-section="frameRebel"][data-subsection="toneOfVoice"]');
                    const inputId = input ? input.id || 'frame-rebel-tone-input' : 'frame-rebel-tone-input';
                    preview.innerHTML = `
                        <div style="position: relative; display: inline-block; margin-top: 1rem;">
                            <img src="${content.frameRebel.toneOfVoice.image}" alt="Preview" style="max-width: 100%; max-height: 300px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                            <button type="button" class="remove-image-btn" data-input-id="${inputId}" data-preview-id="frame-rebel-tone-preview" style="position: absolute; top: 8px; right: 8px; background: rgba(255, 0, 0, 0.8); color: white; border: none; border-radius: 50%; width: 28px; height: 28px; cursor: pointer; font-size: 16px; line-height: 1; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);" title="Remove image">×</button>
                        </div>
                    `;
                    if (input) {
                        const removeBtn = preview.querySelector('.remove-image-btn');
                        if (removeBtn) {
                            removeBtn.addEventListener('click', function() {
                                removeImage(input, 'frame-rebel-tone-preview');
                            });
                        }
                    }
                }
            } else {
                setValueSafely('frame-rebel-tone-content', content.frameRebel.toneOfVoice || '');
            }
        }
    }
    
    // 01. Logotype - Hero Image
    if (content.logotype) {
        // Hero image for logotype section
        const logotypeHeroInput = document.querySelector('[data-section="logotype"].section-hero-image-input');
        const logotypeHeroPreview = document.getElementById('logotype-hero-preview');
        if (content.logotype.image && logotypeHeroPreview) {
            logotypeHeroPreview.innerHTML = `
                <div style="position: relative; display: inline-block; margin-top: 1rem;">
                    <img src="${content.logotype.image}" alt="Preview" style="max-width: 100%; max-height: 300px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <button type="button" class="remove-image-btn" data-preview-id="logotype-hero-preview" style="position: absolute; top: 8px; right: 8px; background: rgba(255, 0, 0, 0.8); color: white; border: none; border-radius: 50%; width: 28px; height: 28px; cursor: pointer; font-size: 16px; line-height: 1; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);" title="Remove image">×</button>
                </div>
            `;
            if (logotypeHeroInput) {
                logotypeHeroInput.setAttribute('data-image-url', content.logotype.image);
                const removeBtn = logotypeHeroPreview.querySelector('.remove-image-btn');
                if (removeBtn) {
                    removeBtn.addEventListener('click', function() {
                        removeImage(logotypeHeroInput, 'logotype-hero-preview');
                    });
                }
            }
        }
        // Load main logo image
        const mainLogoPreview = document.getElementById('main-logo-preview');
        const mainLogoInput = document.getElementById('main-logo-upload');
        if (mainLogoPreview && content.logotype.mainLogo) {
            mainLogoPreview.innerHTML = renderImagePreview(content.logotype.mainLogo, 'main-logo-preview', mainLogoInput);
            const removeBtn = mainLogoPreview.querySelector('.remove-image-btn');
            if (removeBtn && mainLogoInput) {
                removeBtn.addEventListener('click', function() {
                    removeImage(mainLogoInput, 'main-logo-preview');
                });
            }
            // Update label state
            const label = document.getElementById('main-logo-label');
            if (label) {
                label.classList.add('has-file');
                const uploadText = label.querySelector('.upload-text');
                if (uploadText) {
                    uploadText.textContent = 'Change Image';
                }
            }
        }
        
        // Load subsections array (like applications)
        if (content.logotype.subsections && Array.isArray(content.logotype.subsections)) {
            renderLogotypeSubsectionsList(content.logotype.subsections);
        } else {
            // Handle migration from old structure
            const oldSubsections = [];
            const oldFields = ['complementary', 'clearSpace', 'black', 'white', 'color', 'misuse'];
            oldFields.forEach(field => {
                if (content.logotype[field]) {
                    const fieldData = content.logotype[field];
                    oldSubsections.push({
                        title: field.charAt(0).toUpperCase() + field.slice(1),
                        content: typeof fieldData === 'object' ? fieldData.content : fieldData,
                        image: typeof fieldData === 'object' ? fieldData.image : ''
                    });
                }
            });
            if (oldSubsections.length > 0) {
                renderLogotypeSubsectionsList(oldSubsections);
            } else {
                renderLogotypeSubsectionsList([]);
            }
        }
    } else {
        renderLogotypeSubsectionsList([]);
    }
    
    // 03. Color subsections (images are auto-generated, no image uploads)
    if (content.color) {
        if (content.color.corporateColors) {
            const el = document.getElementById('color-corporate-content');
            if (el) {
                if (typeof content.color.corporateColors === 'object') {
                    setValueSafely('color-corporate-content', content.color.corporateColors.content || '');
                } else {
                    setValueSafely('color-corporate-content', content.color.corporateColors || '');
                }
            }
        }
        if (content.color.correctApplications) {
            const el = document.getElementById('color-correct-content');
            if (el) {
                if (typeof content.color.correctApplications === 'object') {
                    setValueSafely('color-correct-content', content.color.correctApplications.content || '');
                } else {
                    setValueSafely('color-correct-content', content.color.correctApplications || '');
                }
            }
        }
        if (content.color.monochromatic) {
            const el = document.getElementById('color-monochromatic-content');
            if (el) {
                if (typeof content.color.monochromatic === 'object') {
                    setValueSafely('color-monochromatic-content', content.color.monochromatic.content || '');
                } else {
                    setValueSafely('color-monochromatic-content', content.color.monochromatic || '');
                }
            }
        }
        if (content.color.incorrectApplications) {
            const el = document.getElementById('color-incorrect-content');
            if (el) {
                if (typeof content.color.incorrectApplications === 'object') {
                    setValueSafely('color-incorrect-content', content.color.incorrectApplications.content || '');
                } else {
                    setValueSafely('color-incorrect-content', content.color.incorrectApplications || '');
                }
            }
        }
    }
    
    // 04. Typography Section
    if (content.typographySection) {
        ['mainTypography', 'secondaryTypography'].forEach(subsection => {
            const camelToKebab = (str) => str.replace(/([A-Z])/g, '-$1').toLowerCase();
            const elId = `typography-${camelToKebab(subsection)}-content`;
            const el = document.getElementById(elId);
            if (el && content.typographySection[subsection]) {
                if (typeof content.typographySection[subsection] === 'object') {
                    setValueSafely(elId, content.typographySection[subsection].content || '');
                    const previewId = `typography-${camelToKebab(subsection)}-preview`;
                    const preview = document.getElementById(previewId);
                    if (preview && content.typographySection[subsection].image) {
                        const input = document.querySelector(`[data-section="typographySection"][data-subsection="${subsection}"]`);
                        preview.innerHTML = renderImagePreview(content.typographySection[subsection].image, previewId, input);
                        const removeBtn = preview.querySelector('.remove-image-btn');
                        if (removeBtn && input) {
                            removeBtn.addEventListener('click', function() {
                                removeImage(input, previewId);
                            });
                        }
                    }
                } else {
                    setValueSafely(elId, content.typographySection[subsection] || '');
                }
            }
        });
    }
    
    // 05. Applications - render as array
    if (content.applications) {
        // Check if it's the new array format or old object format
        if (Array.isArray(content.applications)) {
            renderApplicationsList(content.applications);
        } else {
            // Migrate old format to new array format
            const applicationsArray = [];
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
            renderApplicationsList(applicationsArray);
        }
    } else {
        renderApplicationsList([]);
    }
    
    // Colors - render color list
    renderColorsList(content.colors || []);
    
    // Typography
    setValueSafely('font-primary', content.typography?.primary || '');
    setValueSafely('font-secondary', content.typography?.secondary || '');
    
    
    // Assets
    renderAssets(content.assets || []);
    
    // Section Visibility
    if (content.hiddenSections) {
        Object.keys(content.hiddenSections).forEach(sectionId => {
            const checkbox = document.getElementById(`visibility-${sectionId}`);
            if (checkbox) {
                checkbox.checked = !content.hiddenSections[sectionId];
            }
        });
    } else {
        document.querySelectorAll('[id^="visibility-"]').forEach(checkbox => {
            checkbox.checked = true;
        });
    }
    
    syncColorInputs();
    setupVisibilityControls();
    setupApplicationsHandlers();
    setupLogotypeHandlers(); // Setup logotype handlers
    initializeStyledFileUploads();
    setupImageUploadHandlers();
    
    // Initial renumbering based on current visibility
    setTimeout(() => {
        renumberSections();
    }, 50);
    
    } catch (error) {
        console.error('Error in populateForm:', error);
        const errorMessage = error.message || 'Unknown error';
        showStatus('Error populating form: ' + errorMessage, 'error');
        // Don't throw - let the form continue loading what it can
    }
}

// Sync color picker with hex input
function syncColorInputs() {
    const colorInputs = ['primary', 'secondary', 'accent'];
    colorInputs.forEach(color => {
        const picker = document.getElementById(`color-${color}`);
        const hex = document.getElementById(`color-${color}-hex`);
        
        if (picker && hex) {
            picker.addEventListener('input', () => {
                hex.value = picker.value;
            });
            
            hex.addEventListener('input', () => {
                if (/^#[0-9A-F]{6}$/i.test(hex.value)) {
                    picker.value = hex.value;
                }
            });
        }
    });
}

// Functions for managing color application examples
function loadColorExamples(subsection, examples) {
    const container = document.getElementById(`color-${subsection}-examples`);
    if (!container) return;
    
    container.innerHTML = '';
    if (!examples || !Array.isArray(examples)) return;
    
    examples.forEach((example, index) => {
        const exampleDiv = createExampleElement(subsection, index, example.backgroundColor || '#ffffff');
        container.appendChild(exampleDiv);
    });
}

function createExampleElement(subsection, index, backgroundColor) {
    const div = document.createElement('div');
    div.className = 'color-example-item-admin';
    div.style.marginBottom = '1rem';
    div.style.padding = '1rem';
    div.style.border = '1px solid #ddd';
    div.style.borderRadius = '4px';
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.gap = '1rem';
    
    div.innerHTML = `
        <input type="color" class="color-example-bg-input" value="${backgroundColor}" data-subsection="${subsection}" data-index="${index}" style="width: 60px; height: 40px; border: none; cursor: pointer;">
        <div class="color-example-preview" style="width: 100px; height: 100px; background-color: ${backgroundColor}; border: 1px solid #ddd; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
            <div class="color-example-logo-preview" style="width: 80%; height: 80%;"></div>
        </div>
        <button type="button" class="btn btn-small btn-danger" onclick="removeColorExample('${subsection}', ${index})" style="margin-left: auto;">Remove</button>
    `;
    
    // Update preview when color changes
    const colorInput = div.querySelector('.color-example-bg-input');
    const preview = div.querySelector('.color-example-preview');
    const logoPreview = div.querySelector('.color-example-logo-preview');
    
    // Get logo from textarea
    const logoInput = document.getElementById('logo-upload');
    const logoValue = logoInput ? logoInput.value : (currentContent && currentContent.logo ? currentContent.logo : '');
    
    if (logoValue && logoValue.trim().startsWith('<svg')) {
        logoPreview.innerHTML = logoValue;
    }
    
    colorInput.addEventListener('input', function() {
        preview.style.backgroundColor = this.value;
    });
    
    return div;
}

function addColorExample(subsection) {
    const container = document.getElementById(`color-${subsection}-examples`);
    if (!container) return;
    
    const currentExamples = container.querySelectorAll('.color-example-item-admin').length;
    const newExample = createExampleElement(subsection, currentExamples, '#ffffff');
    container.appendChild(newExample);
}

function removeColorExample(subsection, index) {
    const container = document.getElementById(`color-${subsection}-examples`);
    if (!container) return;
    
    const items = container.querySelectorAll('.color-example-item-admin');
    if (items[index]) {
        items[index].remove();
        // Reindex remaining items
        const remainingItems = container.querySelectorAll('.color-example-item-admin');
        remainingItems.forEach((item, newIndex) => {
            const colorInput = item.querySelector('.color-example-bg-input');
            const removeBtn = item.querySelector('button');
            if (colorInput) {
                colorInput.setAttribute('data-index', newIndex);
            }
            if (removeBtn) {
                removeBtn.setAttribute('onclick', `removeColorExample('${subsection}', ${newIndex})`);
            }
        });
    }
}

function getColorExamples(subsection) {
    const container = document.getElementById(`color-${subsection}-examples`);
    if (!container) return [];
    
    const examples = [];
    const items = container.querySelectorAll('.color-example-item-admin');
    items.forEach(item => {
        const colorInput = item.querySelector('.color-example-bg-input');
        if (colorInput && colorInput.value) {
            examples.push({
                backgroundColor: colorInput.value
            });
        }
    });
    
    return examples;
}

function updateColorExampleLogoPreviews() {
    // Get logo from textarea
    const logoInput = document.getElementById('logo-upload');
    const logoValue = logoInput ? logoInput.value : (currentContent && currentContent.logo ? currentContent.logo : '');
    
    ['correctApplications', 'incorrectApplications'].forEach(subsection => {
        const container = document.getElementById(`color-${subsection}-examples`);
        if (!container) return;
        
        const logoPreviews = container.querySelectorAll('.color-example-logo-preview');
        logoPreviews.forEach(preview => {
            if (logoValue && logoValue.trim().startsWith('<svg')) {
                preview.innerHTML = logoValue;
            } else {
                preview.innerHTML = '';
            }
        });
    });
}

// Handle asset upload
async function handleAssetUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('image', file);
    formData.append('name', file.name);
    
    try {
        const response = await fetch('/api/assets', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (result.success) {
            await loadContent();
            showStatus('Asset uploaded successfully', 'success');
        }
    } catch (error) {
        console.error('Error uploading asset:', error);
        showStatus('Error uploading asset', 'error');
    }
    event.target.value = '';
}

// Render assets list
function renderAssets(assets) {
    const assetsList = document.getElementById('assets-list');
    if (assets.length === 0) {
        assetsList.innerHTML = '<p>No assets uploaded yet.</p>';
        return;
    }
    
    assetsList.innerHTML = assets.map(asset => {
        // Support both old base64 data and new URL format
        const imageSrc = asset.url || asset.data || '';
        return `
        <div class="asset-item-admin">
            <img src="${imageSrc}" alt="${asset.name}" style="max-width: 150px; max-height: 150px;">
            <div class="asset-info">
                <p><strong>${asset.name}</strong></p>
                <p class="asset-date">${new Date(asset.uploadedAt).toLocaleDateString()}</p>
                <button class="btn btn-danger btn-small" onclick="deleteAsset('${asset.id}')">Delete</button>
            </div>
        </div>
    `}).join('');
}

// Colors management
let colorCounter = 0;

function renderColorsList(colors) {
    const colorsList = document.getElementById('colors-list');
    if (!colorsList) return;
    
    // Ensure colors is an array
    const colorsArray = Array.isArray(colors) ? colors : [];
    
    if (colorsArray.length === 0) {
        colorsList.innerHTML = '<p style="color: #999; margin-bottom: 1rem;">No colors added yet. Click "Add Color" to get started.</p>';
        return;
    }
    
    colorsList.innerHTML = colorsArray.map((color, index) => {
        colorCounter = Math.max(colorCounter, index);
        return `
            <div class="color-item-admin" data-color-index="${index}">
                <div class="color-item-admin-content">
                    <div class="form-group" style="flex: 1; margin-right: 1rem;">
                        <label>Color Name</label>
                        <input type="text" class="form-control color-name-input" value="${(color.name || '').replace(/"/g, '&quot;')}" placeholder="e.g., may-green">
                    </div>
                    <div class="form-group" style="flex: 1; margin-right: 1rem;">
                        <label>Hex Code</label>
                        <input type="text" class="form-control color-hex-input" value="${color.hex || '#000000'}" placeholder="#000000" pattern="^#[0-9A-Fa-f]{6}$">
                    </div>
                    <div class="form-group" style="width: 150px; margin-right: 1rem;">
                        <label>Type</label>
                        <select class="form-control color-type-input">
                            <option value="primary" ${color.type === 'primary' ? 'selected' : ''}>Primary</option>
                            <option value="secondary" ${color.type === 'secondary' ? 'selected' : ''}>Secondary</option>
                        </select>
                    </div>
                    <div class="form-group" style="width: auto; display: flex; align-items: flex-end;">
                        <button type="button" class="btn btn-danger" onclick="removeColorItem(${index})" style="margin-bottom: 0;">Remove</button>
                    </div>
                </div>
                <div class="color-preview-swatch" style="background-color: ${color.hex || '#000000'}; margin-top: 0.5rem; width: 100%; height: 60px; border-radius: 4px;"></div>
            </div>
        `;
    }).join('');
    
    // Add event listeners for hex input to update preview
    const hexInputs = colorsList.querySelectorAll('.color-hex-input');
    hexInputs.forEach(input => {
        input.addEventListener('input', function() {
            const item = this.closest('.color-item-admin');
            const preview = item.querySelector('.color-preview-swatch');
            if (preview) {
                preview.style.backgroundColor = this.value || '#000000';
            }
        });
    });
    
    // Update color counter
    colorCounter = colorsArray.length;
}

function addColorItem() {
    const colorsList = document.getElementById('colors-list');
    if (!colorsList) return;
    
    colorCounter++;
    const newColorHtml = `
        <div class="color-item-admin" data-color-index="${colorCounter}">
            <div class="color-item-admin-content">
                <div class="form-group" style="flex: 1; margin-right: 1rem;">
                    <label>Color Name</label>
                    <input type="text" class="form-control color-name-input" value="" placeholder="e.g., may-green">
                </div>
                <div class="form-group" style="flex: 1; margin-right: 1rem;">
                    <label>Hex Code</label>
                    <input type="text" class="form-control color-hex-input" value="#000000" placeholder="#000000" pattern="^#[0-9A-Fa-f]{6}$">
                </div>
                <div class="form-group" style="width: 150px; margin-right: 1rem;">
                    <label>Type</label>
                    <select class="form-control color-type-input">
                        <option value="primary" selected>Primary</option>
                        <option value="secondary">Secondary</option>
                    </select>
                </div>
                <div class="form-group" style="width: auto; display: flex; align-items: flex-end;">
                    <button type="button" class="btn btn-danger" onclick="removeColorItem(${colorCounter})" style="margin-bottom: 0;">Remove</button>
                </div>
            </div>
            <div class="color-preview-swatch" style="background-color: #000000; margin-top: 0.5rem; width: 100%; height: 60px; border-radius: 4px;"></div>
        </div>
    `;
    
    if (colorsList.innerHTML.includes('No colors added yet')) {
        colorsList.innerHTML = newColorHtml;
    } else {
        colorsList.insertAdjacentHTML('beforeend', newColorHtml);
    }
    
    // Add event listeners for hex input to update preview
    const hexInputs = colorsList.querySelectorAll('.color-hex-input');
    hexInputs.forEach(input => {
        input.addEventListener('input', function() {
            const item = this.closest('.color-item-admin');
            const preview = item.querySelector('.color-preview-swatch');
            if (preview) {
                preview.style.backgroundColor = this.value || '#000000';
            }
        });
    });
}

function removeColorItem(index) {
    const colorsList = document.getElementById('colors-list');
    if (!colorsList) return;
    
    const item = colorsList.querySelector(`[data-color-index="${index}"]`);
    if (item) {
        item.remove();
        
        // If no colors left, show message
        if (colorsList.children.length === 0) {
            colorsList.innerHTML = '<p style="color: #999; margin-bottom: 1rem;">No colors added yet. Click "Add Color" to get started.</p>';
        }
    }
}

function getColorsFromForm() {
    const colorsList = document.getElementById('colors-list');
    if (!colorsList) return [];
    
    const colorItems = colorsList.querySelectorAll('.color-item-admin');
    const colors = [];
    
    colorItems.forEach(item => {
        const nameInput = item.querySelector('.color-name-input');
        const hexInput = item.querySelector('.color-hex-input');
        const typeSelect = item.querySelector('.color-type-input');
        
        if (nameInput && hexInput && typeSelect) {
            const name = nameInput.value.trim();
            const hex = hexInput.value.trim();
            const type = typeSelect.value;
            
            if (name && hex) {
                colors.push({
                    name: name,
                    hex: hex,
                    type: type
                });
            }
        }
    });
    
    return colors;
}

// Applications repeater functions
let applicationCounter = 0;

function renderApplicationsList(applications) {
    const applicationsList = document.getElementById('applications-list');
    if (!applicationsList) return;
    
    const applicationsArray = Array.isArray(applications) ? applications : [];
    
    if (applicationsArray.length === 0) {
        applicationsList.innerHTML = '<p style="color: #999; margin-bottom: 1rem;">No application subsections added yet. Click "Add Application Subsection" to get started.</p>';
        applicationCounter = 0;
        return;
    }
    
    applicationsList.innerHTML = applicationsArray.map((app, index) => {
        applicationCounter = Math.max(applicationCounter, index);
        const appId = `application-${index}`;
        const titleId = `application-title-${index}`;
        const contentId = `application-content-${index}`;
        const imageInputId = `application-image-${index}`;
        const previewId = `application-preview-${index}`;
        
        return `
            <div class="application-item-admin" data-application-index="${index}" style="margin-bottom: 3rem; padding: 2rem; border: 1px solid #e0e0e0; border-radius: 8px; background: #fff;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h3 style="margin: 0; font-size: 1.125rem; font-weight: normal;">Application Subsection ${index + 1}</h3>
                    <button type="button" class="btn btn-danger" onclick="removeApplicationItem(${index})">Remove</button>
                </div>
                <div class="form-group">
                    <label>Subsection Title</label>
                    <input type="text" class="form-control application-title-input" id="${titleId}" value="${(app.title || '').replace(/"/g, '&quot;')}" placeholder="e.g., Business Cards">
                </div>
                <div class="form-group" style="margin-top: 1.5rem;">
                    <label>Image</label>
                    <div class="file-upload-wrapper">
                        <label for="${imageInputId}" class="file-upload-label ${app.image ? 'has-file' : ''}">
                            <span class="upload-icon">
                                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 15V3M12 3L8 7M12 3L16 7M2 17L2 19C2 20.1046 2.89543 21 4 21L20 21C21.1046 21 22 20.1046 22 19L22 17" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </span>
                            <span class="upload-text">${app.image ? 'Change Image' : 'Upload images/videos'}</span>
                            <span class="upload-hint">Click to browse, or drag & drop files here</span>
                        </label>
                        <input type="file" class="file-upload-input application-image-input" id="${imageInputId}" data-application-index="${index}" accept="image/*">
                        <div class="file-name-display" id="${imageInputId}-filename"></div>
                    </div>
                    <div class="image-preview" id="${previewId}" style="margin-top: 1rem;">${app.image ? renderImagePreview(app.image, previewId, null).replace('${previewId}', previewId) : ''}</div>
                </div>
                <div class="form-group" style="margin-top: 1.5rem;">
                    <label>Description/Content</label>
                    <textarea class="form-control application-content-input" id="${contentId}" rows="6" placeholder="Enter description/content...">${(app.content || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
                </div>
            </div>
        `;
    }).join('');
    
    // Setup image upload handlers for new items
    setupApplicationImageHandlers();
    
    // Attach remove button handlers for application images (after DOM is updated)
    setTimeout(() => {
        applicationsArray.forEach((app, index) => {
            const previewId = `application-preview-${index}`;
            const preview = document.getElementById(previewId);
            if (preview && app.image) {
                const removeBtn = preview.querySelector('.remove-image-btn');
                if (removeBtn) {
                    const imageInput = document.getElementById(`application-image-${index}`);
                    removeBtn.setAttribute('data-input-id', `application-image-${index}`);
                    removeBtn.setAttribute('data-preview-id', previewId);
                    // Event delegation will handle the click, but we can also attach directly as backup
                    removeBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        removeImage(imageInput, previewId);
                    });
                }
            }
        });
    }, 0);
}

function addApplicationItem() {
    const applicationsList = document.getElementById('applications-list');
    if (!applicationsList) return;
    
    applicationCounter++;
    const appId = `application-${applicationCounter}`;
    const titleId = `application-title-${applicationCounter}`;
    const contentId = `application-content-${applicationCounter}`;
    const imageInputId = `application-image-${applicationCounter}`;
    const previewId = `application-preview-${applicationCounter}`;
    
    const newApplicationHtml = `
        <div class="application-item-admin" data-application-index="${applicationCounter}" style="margin-bottom: 3rem; padding: 2rem; border: 1px solid #e0e0e0; border-radius: 8px; background: #fff;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h3 style="margin: 0; font-size: 1.125rem; font-weight: normal;">Application Subsection ${applicationCounter + 1}</h3>
                <button type="button" class="btn btn-danger" onclick="removeApplicationItem(${applicationCounter})">Remove</button>
            </div>
            <div class="form-group">
                <label>Subsection Title</label>
                <input type="text" class="form-control application-title-input" id="${titleId}" value="" placeholder="e.g., Business Cards" oninput="updateAdminNavApplications()">
            </div>
            <div class="form-group" style="margin-top: 1.5rem;">
                <label>Hero Image</label>
                <div class="file-upload-wrapper">
                    <label for="${imageInputId}" class="file-upload-label">
                        <span class="upload-icon">
                            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 15V3M12 3L8 7M12 3L16 7M2 17L2 19C2 20.1046 2.89543 21 4 21L20 21C21.1046 21 22 20.1046 22 19L22 17" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </span>
                        <span class="upload-text">Upload images/videos</span>
                        <span class="upload-hint">Click to browse, or drag & drop files here</span>
                    </label>
                    <input type="file" class="file-upload-input application-image-input" id="${imageInputId}" data-application-index="${applicationCounter}" accept="image/*">
                    <div class="file-name-display" id="${imageInputId}-filename"></div>
                </div>
                <div class="image-preview" id="${previewId}" style="margin-top: 1rem;"></div>
            </div>
            <div class="form-group" style="margin-top: 1.5rem;">
                <label>Description/Content</label>
                <textarea class="form-control application-content-input" id="${contentId}" rows="6" placeholder="Enter description/content..."></textarea>
            </div>
        </div>
    `;
    
    const existingContent = applicationsList.innerHTML;
    if (existingContent.includes('No application subsections')) {
        applicationsList.innerHTML = newApplicationHtml;
    } else {
        applicationsList.insertAdjacentHTML('beforeend', newApplicationHtml);
    }
    
    // Setup image upload handler for new item
    setupApplicationImageHandlers();
    // Update admin navigation
    updateAdminNavApplications(getApplicationsFromFormSync());
}

function removeApplicationItem(index) {
    const applicationsList = document.getElementById('applications-list');
    if (!applicationsList) return;
    
    const item = applicationsList.querySelector(`[data-application-index="${index}"]`);
    if (item) {
        item.remove();
        
        // Reindex remaining items
        const remainingItems = applicationsList.querySelectorAll('.application-item-admin');
        remainingItems.forEach((item, newIndex) => {
            item.setAttribute('data-application-index', newIndex);
            const titleInput = item.querySelector('.application-title-input');
            const contentInput = item.querySelector('.application-content-input');
            const imageInput = item.querySelector('.application-image-input');
            const preview = item.querySelector('.image-preview');
            const removeBtn = item.querySelector('button');
            const heading = item.querySelector('h3');
            
            if (titleInput) {
                titleInput.id = `application-title-${newIndex}`;
                titleInput.setAttribute('oninput', 'updateAdminNavApplications()');
            }
            if (contentInput) {
                contentInput.id = `application-content-${newIndex}`;
            }
            if (imageInput) {
                imageInput.id = `application-image-${newIndex}`;
                imageInput.setAttribute('data-application-index', newIndex);
            }
            if (preview) {
                preview.id = `application-preview-${newIndex}`;
            }
            if (removeBtn) {
                removeBtn.setAttribute('onclick', `removeApplicationItem(${newIndex})`);
            }
            if (heading) {
                heading.textContent = `Application Subsection ${newIndex + 1}`;
            }
        });
        
        // If no applications left, show message
        if (applicationsList.children.length === 0) {
            applicationsList.innerHTML = '<p style="color: #999; margin-bottom: 1rem;">No application subsections added yet. Click "Add Application Subsection" to get started.</p>';
            applicationCounter = 0;
            updateAdminNavApplications([]);
        } else {
            applicationCounter = remainingItems.length - 1;
            // Update nav with current applications
            const currentApps = getApplicationsFromFormSync();
            updateAdminNavApplications(currentApps);
        }
        
        // Re-setup image handlers after reindexing
        setupApplicationImageHandlers();
    }
}

// Synchronous version for getting applications (for nav updates)
function getApplicationsFromFormSync() {
    const applicationsList = document.getElementById('applications-list');
    if (!applicationsList) return [];
    
    const applicationItems = applicationsList.querySelectorAll('.application-item-admin');
    const applications = [];
    
    applicationItems.forEach((item) => {
        const titleInput = item.querySelector('.application-title-input');
        const contentInput = item.querySelector('.application-content-input');
        const preview = item.querySelector('.image-preview img');
        
        const title = titleInput ? titleInput.value.trim() : '';
        const content = contentInput ? contentInput.value.trim() : '';
        const image = preview ? preview.src : '';
        
        if (title) {
            applications.push({
                title: title,
                content: content,
                image: image
            });
        }
    });
    
    return applications;
}

function getApplicationsFromForm() {
    const applicationsList = document.getElementById('applications-list');
    if (!applicationsList) return [];
    
    const applicationItems = applicationsList.querySelectorAll('.application-item-admin');
    const applications = [];
    
    applicationItems.forEach((item, index) => {
        const titleInput = item.querySelector('.application-title-input');
        const contentInput = item.querySelector('.application-content-input');
        const imageInput = item.querySelector('.application-image-input');
        const preview = item.querySelector('.image-preview img');
        
        const title = titleInput ? titleInput.value.trim() : '';
        const content = contentInput ? contentInput.value.trim() : '';
        const image = preview ? preview.src : '';
        
        if (title) {
            applications.push({
                title: title,
                content: content,
                image: image
            });
        }
    });
    
    return applications;
}

function setupApplicationsHandlers() {
    const addBtn = document.getElementById('add-application-btn');
    if (addBtn) {
        addBtn.addEventListener('click', addApplicationItem);
    }
}

// Logotype repeater functions
let logotypeCounter = 0;

// Predefined subsection templates
const LOGOTYPE_SUBSECTION_TEMPLATES = {
    'main-positive': {
        title: 'Main (Positive)',
        content: `Description:
The main logotype is the primary brand identifier. The positive version uses dark text on light backgrounds for maximum readability.

Usage:
• White or light-colored backgrounds
• Light photographs
• Light-colored materials

General Rule:
The logotype should never be stretched, skewed, or modified. Its correct proportions and spacing must always be maintained.`,
        hasTabs: false
    },
    'main-negative': {
        title: 'Main (Negative)',
        content: `Description:
The negative version of the logotype is designed for dark backgrounds, using light or white elements for strong contrast and visibility.

Usage:
• Dark or black backgrounds
• Dark photographs
• Dark-colored materials

Accessibility:
Ensure sufficient contrast (minimum 4.5:1) for accessibility compliance. Never place the negative logo on backgrounds that don't provide adequate contrast.`,
        hasTabs: false
    },
    'iconotype': {
        title: 'Iconotype',
        content: `Description:
The iconotype is a simplified symbol version of the brand mark, to be used independently when space is limited or a more graphic treatment is needed.

When to use:
• Social media profile pictures
• App icons
• Favicons
• Small-scale applications
• When the full logotype won't fit

Consistency:
The iconotype should maintain the same visual language as the main logotype and be used consistently.`,
        hasTabs: false
    },
    'dimensions-minimum-sizes': {
        title: 'Dimensions and Minimum Sizes',
        content: `General Rule:
The logotype must never be used below specified minimum sizes to ensure legibility and impact.

Print Applications:
• Minimum height: 12mm (0.47 inches)
• Clear space: Equal to half the logotype height

Digital Applications:
• Minimum height: 24px for standard displays
• Minimum height: 48px for high-density displays (Retina)

Scaling:
Always maintain the aspect ratio when scaling. Never compress or stretch horizontally or vertically.`,
        hasTabs: false
    },
    'protection-zones': {
        title: 'Protection Zones',
        content: `Description:
The protection zone is the minimum clear space surrounding the logotype on all sides to ensure visual breathing room and impact.

Measurement:
The protection zone is equal to the height of the letter "X" in the logotype. No other graphic elements, text, or images should intrude.

Guidelines:
• Maintain clear space on all four sides
• No overlapping elements
• No text placement within the zone
• No decorative elements crossing the boundary`,
        hasTabs: false
    },
    'usage': {
        title: 'Usage',
        content: '',
        hasTabs: true,
        tabs: {
            light: {
                label: 'Light',
                content: `Description:
The light version of the logotype uses dark text on light backgrounds for optimal readability and contrast.

Usage Guidelines:
• Use on white or light-colored backgrounds
• Suitable for light photographs and imagery
• Ideal for print materials on light stock
• Ensure sufficient contrast for readability

Best Practices:
• Test visibility before final use
• Avoid busy or complex backgrounds
• Maintain minimum size requirements`
            },
            dark: {
                label: 'Dark',
                content: `Description:
The dark version (negative) of the logotype uses light or white elements on dark backgrounds for strong visual impact.

Usage Guidelines:
• Use on dark or black backgrounds
• Suitable for dark photographs and imagery
• Ideal for digital displays with dark themes
• Ensure minimum 4.5:1 contrast ratio

Best Practices:
• Always verify contrast for accessibility
• Avoid light backgrounds that reduce visibility
• Test on various dark backgrounds before use`
            },
            color: {
                label: 'Color',
                content: `Description:
The color version of the logotype incorporates brand colors while maintaining legibility and visual impact.

Usage Guidelines:
• Use brand colors as specified in the color palette
• Maintain contrast with background
• Ensure accessibility compliance
• Use sparingly for emphasis

Best Practices:
• Follow brand color specifications exactly
• Test color combinations for readability
• Consider color blindness accessibility
• Use full-color version on neutral backgrounds`
            }
        }
    }
};

function renderLogotypeSubsectionsList(subsections) {
    const subsectionsList = document.getElementById('logotype-subsections-list');
    if (!subsectionsList) return;
    
    const subsectionsArray = Array.isArray(subsections) ? subsections : [];
    
    if (subsectionsArray.length === 0) {
        subsectionsList.innerHTML = '<p style="color: #999; margin-bottom: 1rem; padding: 2rem; text-align: center; background: #f8f8f8; border-radius: 8px;">No logotype subsections added yet. Click "Add Subsection" below to get started.</p>';
        logotypeCounter = 0;
        return;
    }
    
    subsectionsList.innerHTML = subsectionsArray.map((subsection, index) => {
        logotypeCounter = Math.max(logotypeCounter, index);
        const subsectionId = `logotype-subsection-${index}`;
        const titleId = `logotype-subsection-title-${index}`;
        const contentId = `logotype-subsection-content-${index}`;
        const imageInputId = `logotype-subsection-image-${index}`;
        const previewId = `logotype-subsection-preview-${index}`;
        
        // Check if this subsection has tabs
        const hasTabs = subsection.hasTabs && subsection.tabs && Object.keys(subsection.tabs).length > 0;
        
        // Build content section - either tabs or textarea
        let contentSection = '';
        if (hasTabs) {
            const tabKeys = Object.keys(subsection.tabs);
            const tabsHtml = tabKeys.map((tabKey, tabIndex) => {
                const tab = subsection.tabs[tabKey];
                const tabContentId = `${contentId}-${tabKey}`;
                const tabImageInputId = `${imageInputId}-${tabKey}`;
                const tabPreviewId = `${previewId}-${tabKey}`;
                const tabLabel = LOGOTYPE_SUBSECTION_TEMPLATES.usage?.tabs?.[tabKey]?.label || tabKey.charAt(0).toUpperCase() + tabKey.slice(1);
                
                return `
                    <div class="logotype-tab-content" data-tab-key="${tabKey}" style="display: ${tabIndex === 0 ? 'block' : 'none'};">
                        <div class="form-group">
                            <label>${tabLabel} Content</label>
                            <textarea class="form-control logotype-subsection-tab-content-input" id="${tabContentId}" rows="8">${((tab.content || '')).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
                        </div>
                        <div class="form-group" style="margin-top: 1.5rem;">
                            <label>${tabLabel} Image</label>
                            <div class="file-upload-wrapper">
                                <label for="${tabImageInputId}" class="file-upload-label ${tab.image ? 'has-file' : ''}">
                                    <span class="upload-icon">
                                        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 15V3M12 3L8 7M12 3L16 7M2 17L2 19C2 20.1046 2.89543 21 4 21L20 21C21.1046 21 22 20.1046 22 19L22 17" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                    </span>
                                    <span class="upload-text">${tab.image ? 'Change Image' : 'Upload images/videos'}</span>
                                    <span class="upload-hint">Click to browse, or drag & drop files here</span>
                                </label>
                                <input type="file" class="file-upload-input logotype-subsection-tab-image-input" id="${tabImageInputId}" data-logotype-subsection-index="${index}" data-tab-key="${tabKey}" accept="image/*">
                                <div class="file-name-display" id="${tabImageInputId}-filename"></div>
                            </div>
                            <div class="image-preview" id="${tabPreviewId}" style="margin-top: 1rem;">${tab.image ? renderImagePreview(tab.image, tabPreviewId, null) : ''}</div>
                        </div>
                    </div>
                `;
            }).join('');
            
            const tabButtonsHtml = tabKeys.map((tabKey, tabIndex) => {
                const tabLabel = LOGOTYPE_SUBSECTION_TEMPLATES.usage?.tabs?.[tabKey]?.label || tabKey.charAt(0).toUpperCase() + tabKey.slice(1);
                return `
                    <button type="button" class="logotype-tab-button ${tabIndex === 0 ? 'active' : ''}" data-tab-key="${tabKey}" data-subsection-index="${index}" style="padding: 0.75rem 1.5rem; border: none; background: ${tabIndex === 0 ? '#000' : 'transparent'}; color: ${tabIndex === 0 ? '#fff' : '#666'}; cursor: pointer; font-weight: ${tabIndex === 0 ? '500' : '400'}; font-size: 0.875rem; transition: all 0.2s ease; position: relative; border-radius: ${tabIndex === 0 ? '8px 8px 0 0' : '0'};">
                        ${tabLabel}
                    </button>
                `;
            }).join('');
            
            contentSection = `
                <div class="form-group" style="margin-top: 1.5rem;">
                    <label>Content</label>
                    <div style="border: 1px solid #e0e0e0; border-radius: 8px; margin-top: 0.5rem; background: #fff; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                        <div style="display: flex; background: #f8f8f8; border-bottom: 1px solid #e0e0e0; padding: 0.25rem;">
                            ${tabButtonsHtml}
                        </div>
                        <div style="padding: 1.5rem;">
                            ${tabsHtml}
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Regular textarea
            contentSection = `
                <div class="form-group" style="margin-top: 1.5rem;">
                    <label>Description/Content</label>
                    <textarea class="form-control logotype-subsection-content-input" id="${contentId}" rows="8" placeholder="Enter description/content...">${((subsection.content || '')).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
                </div>
            `;
        }
        
        return `
            <div class="logotype-subsection-item-admin" data-logotype-subsection-index="${index}" style="margin-bottom: 3rem; padding: 2rem; border: 1px solid #e0e0e0; border-radius: 8px; background: #fff;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h3 style="margin: 0; font-size: 1.125rem; font-weight: normal;">Logotype Subsection ${index + 1}</h3>
                    <button type="button" class="btn btn-danger" onclick="removeLogotypeSubsectionItem(${index})">Remove</button>
                </div>
                <div class="form-group">
                    <label>Subsection Title</label>
                    <input type="text" class="form-control logotype-subsection-title-input" id="${titleId}" value="${(subsection.title || '').replace(/"/g, '&quot;')}" placeholder="e.g., Iconography">
                </div>
                <div class="form-group" style="margin-top: 1.5rem;">
                    <label>Image</label>
                    <div class="file-upload-wrapper">
                        <label for="${imageInputId}" class="file-upload-label ${subsection.image ? 'has-file' : ''}">
                            <span class="upload-icon">
                                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 15V3M12 3L8 7M12 3L16 7M2 17L2 19C2 20.1046 2.89543 21 4 21L20 21C21.1046 21 22 20.1046 22 19L22 17" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </span>
                            <span class="upload-text">${subsection.image ? 'Change Image' : 'Upload images/videos'}</span>
                            <span class="upload-hint">Click to browse, or drag & drop files here</span>
                        </label>
                        <input type="file" class="file-upload-input logotype-subsection-image-input" id="${imageInputId}" data-logotype-subsection-index="${index}" accept="image/*">
                        <div class="file-name-display" id="${imageInputId}-filename"></div>
                    </div>
                    <div class="image-preview" id="${previewId}" style="margin-top: 1rem;">${subsection.image ? renderImagePreview(subsection.image, previewId, null) : ''}</div>
                </div>
                ${contentSection}
            </div>
        `;
    }).join('');
    
    // Setup image upload handlers for new items
    setupLogotypeSubsectionImageHandlers();
    setupLogotypeTabImageHandlers();
    
    // Store base64 data on inputs and attach remove button handlers
    setTimeout(() => {
        subsectionsArray.forEach((subsection, index) => {
            const imageInputId = `logotype-subsection-image-${index}`;
            const imageInput = document.getElementById(imageInputId);
            const previewId = `logotype-subsection-preview-${index}`;
            const preview = document.getElementById(previewId);
            
            // Store base64 data on input if image exists
            if (imageInput && subsection.image) {
                imageInput.setAttribute('data-base64', subsection.image);
                // Update label state
                const label = document.querySelector(`label[for="${imageInputId}"]`);
                if (label) {
                    label.classList.add('has-file');
                    const uploadText = label.querySelector('.upload-text');
                    if (uploadText) {
                        uploadText.textContent = 'Change Image';
                    }
                }
            }
            
            if (preview && subsection.image) {
                const removeBtn = preview.querySelector('.remove-image-btn');
                if (removeBtn) {
                    removeBtn.setAttribute('data-input-id', imageInputId);
                    removeBtn.setAttribute('data-preview-id', previewId);
                    removeBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        removeImage(imageInput, previewId);
                    });
                }
            }
            
            // Setup tabs if this subsection has tabs
            if (subsection.hasTabs && subsection.tabs) {
                setupLogotypeTabs(index);
                
                // Store base64 data for tab images
                Object.keys(subsection.tabs).forEach(tabKey => {
                    const tab = subsection.tabs[tabKey];
                    const tabImageInputId = `${imageInputId}-${tabKey}`;
                    const tabPreviewId = `${previewId}-${tabKey}`;
                    const tabImageInput = document.getElementById(tabImageInputId);
                    const tabPreview = document.getElementById(tabPreviewId);
                    
                    if (tabImageInput && tab.image) {
                        tabImageInput.setAttribute('data-base64', tab.image);
                        const tabLabel = document.querySelector(`label[for="${tabImageInputId}"]`);
                        if (tabLabel) {
                            tabLabel.classList.add('has-file');
                            const uploadText = tabLabel.querySelector('.upload-text');
                            if (uploadText) {
                                uploadText.textContent = 'Change Image';
                            }
                        }
                    }
                    
                    if (tabPreview && tab.image) {
                        const removeBtn = tabPreview.querySelector('.remove-image-btn');
                        if (removeBtn) {
                            removeBtn.setAttribute('data-input-id', tabImageInputId);
                            removeBtn.setAttribute('data-preview-id', tabPreviewId);
                            removeBtn.addEventListener('click', function(e) {
                                e.preventDefault();
                                e.stopPropagation();
                                removeImage(tabImageInput, tabPreviewId);
                            });
                        }
                    }
                });
            }
        });
    }, 0);
}

function showLogotypeTemplateSelector() {
    console.log('showLogotypeTemplateSelector called');
    
    // Remove any existing overlay first
    const existingOverlay = document.getElementById('logotype-template-selector-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'logotype-template-selector-overlay';
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;';
    
    const modal = document.createElement('div');
    modal.style.cssText = 'background: white; padding: 2rem; border-radius: 8px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.3);';
    
    modal.innerHTML = `
        <h2 style="margin-top: 0; margin-bottom: 1.5rem; font-size: 1.5rem; font-weight: 600;">Select Subsection Template</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem;">
            ${Object.keys(LOGOTYPE_SUBSECTION_TEMPLATES).map(key => {
                const template = LOGOTYPE_SUBSECTION_TEMPLATES[key];
                return `
                    <button type="button" class="btn btn-secondary" data-template-key="${key}" style="padding: 1.25rem; text-align: center; min-height: 100px; display: flex; align-items: center; justify-content: center; white-space: normal; border-radius: 8px; border: 2px solid #e0e0e0; background: #fff; color: #333; font-weight: 500; transition: all 0.2s ease; cursor: pointer;" onmouseover="this.style.borderColor='#000'; this.style.background='#f8f8f8';" onmouseout="this.style.borderColor='#e0e0e0'; this.style.background='#fff';">
                        ${template.title}
                    </button>
                `;
            }).join('')}
        </div>
        <div style="margin-top: 2rem; text-align: right; padding-top: 1.5rem; border-top: 1px solid #e0e0e0;">
            <button type="button" class="btn btn-secondary" id="cancel-template-selector" style="padding: 0.75rem 1.5rem;">Cancel</button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Handle template selection
    modal.querySelectorAll('[data-template-key]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const templateKey = btn.dataset.templateKey;
            if (templateKey && typeof addLogotypeSubsectionItemWithTemplate === 'function') {
                overlay.remove();
                try {
                    addLogotypeSubsectionItemWithTemplate(templateKey);
                } catch (error) {
                    console.error('Error adding subsection with template:', error);
                }
            } else {
                console.error('Invalid template key or function not available:', templateKey);
            }
        });
    });
    
    // Handle cancel
    const cancelBtn = document.getElementById('cancel-template-selector');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            overlay.remove();
        });
    }
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            e.preventDefault();
            overlay.remove();
        }
    });
    
    // Prevent modal content clicks from closing overlay
    modal.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

function addLogotypeSubsectionItem(templateKey = null) {
    console.log('addLogotypeSubsectionItem called with templateKey:', templateKey);
    if (!templateKey) {
        try {
            showLogotypeTemplateSelector();
        } catch (error) {
            console.error('Error showing template selector:', error);
        }
        return;
    }
    try {
        addLogotypeSubsectionItemWithTemplate(templateKey);
    } catch (error) {
        console.error('Error adding subsection item:', error);
    }
}

function addLogotypeSubsectionItemWithTemplate(templateKey) {
    const subsectionsList = document.getElementById('logotype-subsections-list');
    if (!subsectionsList) return;
    
    const template = LOGOTYPE_SUBSECTION_TEMPLATES[templateKey];
    if (!template) return;
    
    logotypeCounter++;
    const subsectionId = `logotype-subsection-${logotypeCounter}`;
    const titleId = `logotype-subsection-title-${logotypeCounter}`;
    const contentId = `logotype-subsection-content-${logotypeCounter}`;
    const imageInputId = `logotype-subsection-image-${logotypeCounter}`;
    const previewId = `logotype-subsection-preview-${logotypeCounter}`;
    
    // Build content section - either tabs or textarea
    let contentSection = '';
    if (template.hasTabs && template.tabs) {
        // Create tabs structure
        const tabNames = Object.keys(template.tabs);
        const tabsHtml = tabNames.map((tabKey, tabIndex) => {
            const tab = template.tabs[tabKey];
            const tabContentId = `${contentId}-${tabKey}`;
            return `
                <div class="logotype-tab-content" data-tab-key="${tabKey}" style="display: ${tabIndex === 0 ? 'block' : 'none'};">
                    <div class="form-group">
                        <label>${tab.label} Content</label>
                        <textarea class="form-control logotype-subsection-tab-content-input" id="${tabContentId}" rows="8">${(tab.content || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
                    </div>
                    <div class="form-group" style="margin-top: 1.5rem;">
                        <label>${tab.label} Image</label>
                        <div class="file-upload-wrapper">
                            <label for="${imageInputId}-${tabKey}" class="file-upload-label">
                                <span class="upload-icon">
                                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 15V3M12 3L8 7M12 3L16 7M2 17L2 19C2 20.1046 2.89543 21 4 21L20 21C21.1046 21 22 20.1046 22 19L22 17" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </span>
                                <span class="upload-text">Upload images/videos</span>
                                <span class="upload-hint">Click to browse, or drag & drop files here</span>
                            </label>
                            <input type="file" class="file-upload-input logotype-subsection-tab-image-input" id="${imageInputId}-${tabKey}" data-logotype-subsection-index="${logotypeCounter}" data-tab-key="${tabKey}" accept="image/*">
                            <div class="file-name-display" id="${imageInputId}-${tabKey}-filename"></div>
                        </div>
                        <div class="image-preview" id="${previewId}-${tabKey}" style="margin-top: 1rem;"></div>
                    </div>
                </div>
            `;
        }).join('');
        
        const tabButtonsHtml = tabNames.map((tabKey, tabIndex) => {
            const tab = template.tabs[tabKey];
            return `
                <button type="button" class="logotype-tab-button ${tabIndex === 0 ? 'active' : ''}" data-tab-key="${tabKey}" data-subsection-index="${logotypeCounter}" style="padding: 0.75rem 1.5rem; border: none; background: ${tabIndex === 0 ? '#000' : 'transparent'}; color: ${tabIndex === 0 ? '#fff' : '#666'}; cursor: pointer; font-weight: ${tabIndex === 0 ? '500' : '400'}; font-size: 0.875rem; transition: all 0.2s ease; position: relative; border-radius: ${tabIndex === 0 ? '8px 8px 0 0' : '0'};">
                    ${tab.label}
                </button>
            `;
        }).join('');
        
        contentSection = `
            <div class="form-group" style="margin-top: 1.5rem;">
                <label>Content</label>
                <div style="border: 1px solid #e0e0e0; border-radius: 8px; margin-top: 0.5rem; background: #fff; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <div style="display: flex; background: #f8f8f8; border-bottom: 1px solid #e0e0e0; padding: 0.25rem;">
                        ${tabButtonsHtml}
                    </div>
                    <div style="padding: 1.5rem;">
                        ${tabsHtml}
                    </div>
                </div>
            </div>
        `;
    } else {
        // Regular textarea
        contentSection = `
            <div class="form-group" style="margin-top: 1.5rem;">
                <label>Description/Content</label>
                <textarea class="form-control logotype-subsection-content-input" id="${contentId}" rows="8">${(template.content || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
            </div>
        `;
    }
    
    const newSubsectionHtml = `
        <div class="logotype-subsection-item-admin" data-logotype-subsection-index="${logotypeCounter}" style="margin-bottom: 3rem; padding: 2rem; border: 1px solid #e0e0e0; border-radius: 8px; background: #fff;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h3 style="margin: 0; font-size: 1.125rem; font-weight: normal;">Logotype Subsection ${logotypeCounter + 1}</h3>
                <button type="button" class="btn btn-danger" onclick="removeLogotypeSubsectionItem(${logotypeCounter})">Remove</button>
            </div>
            <div class="form-group">
                <label>Subsection Title</label>
                <input type="text" class="form-control logotype-subsection-title-input" id="${titleId}" value="${(template.title || '').replace(/"/g, '&quot;')}" placeholder="e.g., Iconography">
            </div>
            <div class="form-group" style="margin-top: 1.5rem;">
                <label>Hero Image</label>
                <div class="file-upload-wrapper">
                    <label for="${imageInputId}" class="file-upload-label">
                        <span class="upload-icon">
                            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 15V3M12 3L8 7M12 3L16 7M2 17L2 19C2 20.1046 2.89543 21 4 21L20 21C21.1046 21 22 20.1046 22 19L22 17" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </span>
                        <span class="upload-text">Upload images/videos</span>
                        <span class="upload-hint">Click to browse, or drag & drop files here</span>
                    </label>
                    <input type="file" class="file-upload-input logotype-subsection-image-input" id="${imageInputId}" data-logotype-subsection-index="${logotypeCounter}" accept="image/*">
                    <div class="file-name-display" id="${imageInputId}-filename"></div>
                </div>
                <div class="image-preview" id="${previewId}" style="margin-top: 1rem;"></div>
            </div>
            ${contentSection}
        </div>
    `;
    
    // Always append to bottom
    if (subsectionsList.innerHTML.includes('No logotype subsections')) {
        subsectionsList.innerHTML = newSubsectionHtml;
    } else {
        subsectionsList.insertAdjacentHTML('beforeend', newSubsectionHtml);
    }
    
    // Scroll to the new subsection
    setTimeout(() => {
        const newItem = subsectionsList.querySelector(`[data-logotype-subsection-index="${logotypeCounter}"]`);
        if (newItem) {
            newItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, 100);
    
    // Setup image upload handler for new item
    setupLogotypeSubsectionImageHandlers();
    setupLogotypeTabImageHandlers();
    
    // Setup tab switching if tabs exist
    if (template.hasTabs && template.tabs) {
        setupLogotypeTabs(logotypeCounter);
    }
}

function removeLogotypeSubsectionItem(index) {
    const subsectionsList = document.getElementById('logotype-subsections-list');
    if (!subsectionsList) return;
    
    const item = subsectionsList.querySelector(`[data-logotype-subsection-index="${index}"]`);
    if (item) {
        item.remove();
        
        // Reindex remaining items
        const remainingItems = subsectionsList.querySelectorAll('.logotype-subsection-item-admin');
        remainingItems.forEach((item, newIndex) => {
            item.setAttribute('data-logotype-subsection-index', newIndex);
            const titleInput = item.querySelector('.logotype-subsection-title-input');
            const contentInput = item.querySelector('.logotype-subsection-content-input');
            const imageInput = item.querySelector('.logotype-subsection-image-input');
            const preview = item.querySelector('.image-preview');
            const removeBtn = item.querySelector('button');
            const heading = item.querySelector('h3');
            
            if (titleInput) {
                titleInput.id = `logotype-subsection-title-${newIndex}`;
            }
            if (contentInput) {
                contentInput.id = `logotype-subsection-content-${newIndex}`;
            }
            if (imageInput) {
                imageInput.id = `logotype-subsection-image-${newIndex}`;
                imageInput.setAttribute('data-logotype-subsection-index', newIndex);
            }
            if (preview) {
                preview.id = `logotype-subsection-preview-${newIndex}`;
            }
            if (removeBtn) {
                removeBtn.setAttribute('onclick', `removeLogotypeSubsectionItem(${newIndex})`);
            }
            if (heading) {
                heading.textContent = `Logotype Subsection ${newIndex + 1}`;
            }
        });
        
        // If no subsections left, show message
        if (subsectionsList.children.length === 0) {
            subsectionsList.innerHTML = '<p style="color: #999; margin-bottom: 1rem;">No logotype subsections added yet. Click "Add Subsection" to get started.</p>';
            logotypeCounter = 0;
        } else {
            // Re-setup image handlers after reindexing
            setupLogotypeSubsectionImageHandlers();
        }
    }
}

async function getLogotypeSubsectionsFromForm() {
    const subsectionsList = document.getElementById('logotype-subsections-list');
    if (!subsectionsList) return [];
    
    const subsectionItems = subsectionsList.querySelectorAll('.logotype-subsection-item-admin');
    const subsections = [];
    
    // Get existing content to preserve images
    const existingSubsections = currentContent.logotype?.subsections || [];
    
    for (let index = 0; index < subsectionItems.length; index++) {
        const item = subsectionItems[index];
        const titleInput = item.querySelector('.logotype-subsection-title-input');
        const contentInput = item.querySelector('.logotype-subsection-content-input');
        const imageInput = item.querySelector('.logotype-subsection-image-input');
        
        const title = titleInput ? titleInput.value.trim() : '';
        
        // Get existing subsection data to preserve images and content
        const existingSubsection = existingSubsections[index] || {};
        const existingImage = existingSubsection.image || '';
        
        // Check if this is a tabbed subsection (has tab content inputs)
        const tabContentInputs = item.querySelectorAll('.logotype-subsection-tab-content-input');
        const tabImageInputs = item.querySelectorAll('.logotype-subsection-tab-image-input');
        
        let content = '';
        let image = '';
        let tabs = null;
        
        if (tabContentInputs.length > 0) {
            // This is a tabbed subsection
            tabs = {};
            const existingTabs = existingSubsection.tabs || {};
            
            for (let tabIndex = 0; tabIndex < tabContentInputs.length; tabIndex++) {
                const tabContentInput = tabContentInputs[tabIndex];
                const tabKey = tabContentInput.id.split('-').pop(); // Get tab key from ID
                const tabContent = tabContentInput ? tabContentInput.value.trim() : '';
                
                // Find corresponding image input
                const tabImageInput = Array.from(tabImageInputs).find(input => input.id && input.id.includes(tabKey));
                const existingTabImage = existingTabs[tabKey]?.image || '';
                const tabImage = tabImageInput ? await getImageFromInput(tabImageInput, existingTabImage) : existingTabImage;
                
                tabs[tabKey] = {
                    content: tabContent,
                    image: tabImage
                };
            }
        } else {
            // Regular subsection - preserve existing content and image
            content = contentInput ? contentInput.value.trim() : '';
            // Use existing image as fallback to preserve it if no new image is uploaded
            image = imageInput ? await getImageFromInput(imageInput, existingImage) : existingImage;
        }
        
        if (title) {
            const subsection = {
                title: title,
                image: image,
                content: content
            };
            
            if (tabs) {
                subsection.tabs = tabs;
                subsection.hasTabs = true;
            }
            
            subsections.push(subsection);
        }
    }
    
    return subsections;
}

function setupLogotypeSubsectionImageHandlers() {
    const imageInputs = document.querySelectorAll('.logotype-subsection-image-input');
    imageInputs.forEach(input => {
        if (!input.hasAttribute('data-handler-added')) {
            input.setAttribute('data-handler-added', 'true');
            input.addEventListener('change', async function(e) {
                const file = e.target.files[0];
                if (!file) return;
                
                const index = this.getAttribute('data-logotype-subsection-index');
                const label = document.querySelector(`label[for="${this.id}"]`);
                const filenameDisplay = document.getElementById(`${this.id}-filename`);
                const preview = document.getElementById(`logotype-subsection-preview-${index}`);
                
                // Update label
                if (label) {
                    label.classList.add('has-file');
                    const uploadText = label.querySelector('.upload-text');
                    if (uploadText) {
                        uploadText.textContent = 'Change Image';
                    }
                }
                
                // Update filename display
                if (filenameDisplay) {
                    filenameDisplay.textContent = file.name;
                    filenameDisplay.style.display = 'block';
                }
                
                // Update preview and store base64 data on input (for getImageFromInput)
                if (preview) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const base64Data = e.target.result;
                        // Store base64 data on input so getImageFromInput can retrieve it
                        input.setAttribute('data-base64', base64Data);
                        
                        const previewId = preview.id;
                        preview.innerHTML = renderImagePreview(base64Data, previewId, input);
                        
                        // Attach remove handler
                        const removeBtn = preview.querySelector('.remove-image-btn');
                        if (removeBtn) {
                            removeBtn.setAttribute('data-input-id', input.id);
                            removeBtn.setAttribute('data-preview-id', previewId);
                            removeBtn.addEventListener('click', function(ev) {
                                ev.preventDefault();
                                ev.stopPropagation();
                                removeImage(input, previewId);
                            });
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    });
}

function setupLogotypeTabImageHandlers() {
    const imageInputs = document.querySelectorAll('.logotype-subsection-tab-image-input');
    imageInputs.forEach(input => {
        if (!input.hasAttribute('data-handler-added')) {
            input.setAttribute('data-handler-added', 'true');
            input.addEventListener('change', async function(e) {
                const file = e.target.files[0];
                if (!file) return;
                
                const index = this.getAttribute('data-logotype-subsection-index');
                const tabKey = this.getAttribute('data-tab-key');
                const label = document.querySelector(`label[for="${this.id}"]`);
                const filenameDisplay = document.getElementById(`${this.id}-filename`);
                const preview = document.getElementById(`logotype-subsection-preview-${index}-${tabKey}`);
                
                // Update label
                if (label) {
                    label.classList.add('has-file');
                    const uploadText = label.querySelector('.upload-text');
                    if (uploadText) {
                        uploadText.textContent = 'Change Image';
                    }
                }
                
                // Update filename display
                if (filenameDisplay) {
                    filenameDisplay.textContent = file.name;
                    filenameDisplay.style.display = 'block';
                }
                
                // Update preview and store base64 data on input (for getImageFromInput)
                if (preview) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const base64Data = e.target.result;
                        // Store base64 data on input so getImageFromInput can retrieve it
                        input.setAttribute('data-base64', base64Data);
                        
                        const previewId = preview.id;
                        preview.innerHTML = renderImagePreview(base64Data, previewId, input);
                        
                        // Attach remove handler
                        const removeBtn = preview.querySelector('.remove-image-btn');
                        if (removeBtn) {
                            removeBtn.setAttribute('data-input-id', input.id);
                            removeBtn.setAttribute('data-preview-id', previewId);
                            removeBtn.addEventListener('click', function(ev) {
                                ev.preventDefault();
                                ev.stopPropagation();
                                removeImage(input, previewId);
                            });
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    });
}

function setupLogotypeTabs(subsectionIndex) {
    const subsectionItem = document.querySelector(`[data-logotype-subsection-index="${subsectionIndex}"]`);
    if (!subsectionItem) return;
    
    const tabButtons = subsectionItem.querySelectorAll('.logotype-tab-button');
    const tabContents = subsectionItem.querySelectorAll('.logotype-tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabKey = button.dataset.tabKey;
            
            // Update button states
            tabButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.style.background = 'transparent';
                btn.style.color = '#666';
                btn.style.fontWeight = '400';
                btn.style.borderRadius = '0';
            });
            button.classList.add('active');
            button.style.background = '#000';
            button.style.color = '#fff';
            button.style.fontWeight = '500';
            button.style.borderRadius = '8px 8px 0 0';
            
            // Update content visibility
            tabContents.forEach(content => {
                content.style.display = content.dataset.tabKey === tabKey ? 'block' : 'none';
            });
        });
    });
}

function setupLogotypeHandlers() {
    const addBtn = document.getElementById('add-logotype-subsection-btn');
    if (addBtn) {
        // Check if handler is already attached
        if (!addBtn.hasAttribute('data-handler-attached')) {
            addBtn.setAttribute('data-handler-attached', 'true');
            addBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Add subsection button clicked');
                try {
                    addLogotypeSubsectionItem();
                } catch (error) {
                    console.error('Error adding logotype subsection:', error);
                }
            });
        }
    }
    
    // Make function globally accessible
    window.addLogotypeSubsectionItem = addLogotypeSubsectionItem;
    window.showLogotypeTemplateSelector = showLogotypeTemplateSelector;
    window.addLogotypeSubsectionItemWithTemplate = addLogotypeSubsectionItemWithTemplate;
    
    // Setup main logo upload handler
    const mainLogoInput = document.getElementById('main-logo-upload');
    if (mainLogoInput) {
        mainLogoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            const label = document.getElementById('main-logo-label');
            const filenameDisplay = document.getElementById('main-logo-filename');
            const preview = document.getElementById('main-logo-preview');
            
            // Update label
            if (label) {
                label.classList.add('has-file');
                const uploadText = label.querySelector('.upload-text');
                if (uploadText) {
                    uploadText.textContent = 'Change Image';
                }
            }
            
            // Update filename display
            if (filenameDisplay) {
                filenameDisplay.textContent = file.name;
                filenameDisplay.style.display = 'block';
            }
            
            // Update preview
            if (preview) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    preview.innerHTML = renderImagePreview(e.target.result, 'main-logo-preview', mainLogoInput);
                    
                    // Attach remove handler
                    const removeBtn = preview.querySelector('.remove-image-btn');
                    if (removeBtn) {
                        removeBtn.addEventListener('click', function(ev) {
                            ev.preventDefault();
                            ev.stopPropagation();
                            removeImage(mainLogoInput, 'main-logo-preview');
                        });
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

async function setupApplicationImageHandlers() {
    const imageInputs = document.querySelectorAll('.application-image-input');
    imageInputs.forEach(input => {
        // Remove existing listeners by cloning
        const newInput = input.cloneNode(true);
        const parent = input.parentNode;
        parent.replaceChild(newInput, input);
        
        // Find associated label and filename display
        const inputId = newInput.id;
        const label = document.querySelector(`label[for="${inputId}"]`);
        const filenameDisplay = document.getElementById(`${inputId}-filename`);
        const preview = document.getElementById(`application-preview-${newInput.getAttribute('data-application-index')}`);
        
        newInput.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            // Update label to show file selected
            if (label) {
                label.classList.add('has-file');
                const uploadText = label.querySelector('.upload-text');
                if (uploadText) {
                    uploadText.textContent = 'Change Image';
                }
                const uploadIcon = label.querySelector('.upload-icon');
                if (uploadIcon) {
                    uploadIcon.style.display = 'none';
                }
            }
            
            // Update filename display
            if (filenameDisplay) {
                filenameDisplay.textContent = file.name;
                filenameDisplay.style.display = 'block';
            }
            
            // Update preview
            if (preview) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const previewId = preview.id;
                    preview.innerHTML = renderImagePreview(e.target.result, previewId, newInput);
                    
                    // Attach remove handler
                    const removeBtn = preview.querySelector('.remove-image-btn');
                    if (removeBtn) {
                        removeBtn.setAttribute('data-input-id', newInput.id);
                        removeBtn.setAttribute('data-preview-id', previewId);
                        removeBtn.addEventListener('click', function(ev) {
                            ev.preventDefault();
                            ev.stopPropagation();
                            removeImage(newInput, previewId);
                        });
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    });
}

// Handle Figma JSON file upload
async function handleFigmaFileUpload(event) {
    const file = event.target.files[0];
    const resultsDiv = document.getElementById('figma-sync-results');
    const autoApply = document.getElementById('figma-auto-apply').checked;
    
    if (!file) {
        return;
    }
    
    if (!file.name.endsWith('.json')) {
        resultsDiv.innerHTML = `<div style="color: #d32f2f; padding: 1rem; background: #ffebee; border-radius: 4px;">
            <strong>Error:</strong> Please upload a JSON file
        </div>`;
        showStatus('Please upload a JSON file', 'error');
        return;
    }
    
    resultsDiv.innerHTML = '<p>Reading file... Please wait.</p>';
    showStatus('Reading Figma export file...', 'info');
    
    try {
        const fileContent = await file.text();
        let figmaData;
        
        try {
            figmaData = JSON.parse(fileContent);
        } catch (parseError) {
            resultsDiv.innerHTML = `<div style="color: #d32f2f; padding: 1rem; background: #ffebee; border-radius: 4px;">
                <strong>Error:</strong> Invalid JSON file: ${parseError.message}
            </div>`;
            showStatus(`Invalid JSON file: ${parseError.message}`, 'error');
            return;
        }
        
        // Send to server for processing
        const response = await fetch('/api/figma/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                data: figmaData,
                autoApply: autoApply 
            })
        });
        
        const result = await response.json();
        
        if (result.error) {
            resultsDiv.innerHTML = `<div style="color: #d32f2f; padding: 1rem; background: #ffebee; border-radius: 4px;">
                <strong>Error:</strong> ${result.error}
            </div>`;
            showStatus(`Error: ${result.error}`, 'error');
            return;
        }
        
        if (result.success) {
            const colorsCount = result.colors ? result.colors.length : 0;
            const typographyCount = result.typography ? result.typography.length : 0;
            
            resultsDiv.innerHTML = `
                <div style="padding: 1rem; background: #e8f5e9; border-radius: 4px; margin-bottom: 1rem;">
                    <h4 style="margin: 0 0 0.5rem 0; color: #2e7d32;">✓ Import Successful!</h4>
                    <p style="margin: 0.5rem 0 0 0;"><strong>Found:</strong> ${colorsCount} colors, ${typographyCount} typography styles</p>
                    ${result.autoApplied ? '<p style="margin: 0.5rem 0 0 0; color: #2e7d32;"><strong>✓ Data has been automatically applied to your brand toolkit!</strong></p>' : ''}
                </div>
                ${colorsCount > 0 ? `
                    <div style="margin-top: 1rem;">
                        <h4>Extracted Colors:</h4>
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; margin-top: 1rem;">
                            ${result.colors.map(color => `
                                <div style="padding: 1rem; border: 1px solid #ddd; border-radius: 4px;">
                                    <div style="width: 100%; height: 60px; background-color: ${color.hex}; border-radius: 4px; margin-bottom: 0.5rem;"></div>
                                    <strong>${color.name}</strong><br>
                                    <code>${color.hex}</code>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                ${typographyCount > 0 ? `
                    <div style="margin-top: 1rem;">
                        <h4>Extracted Typography:</h4>
                        <div style="margin-top: 1rem;">
                            ${result.typography.map(typo => `
                                <div style="padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 0.5rem;">
                                    <strong>${typo.name || 'Untitled'}</strong><br>
                                    <span style="font-size: 0.9em; color: #666;">
                                        ${typo.fontFamily} - ${typo.fontSize ? typo.fontSize + 'px' : 'N/A'} / ${typo.fontWeight || 'normal'}
                                    </span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                ${!result.autoApplied && (colorsCount > 0 || typographyCount > 0) ? `
                    <button type="button" class="btn btn-primary" onclick="applyFigmaData(${JSON.stringify(result).replace(/"/g, '&quot;')})" style="margin-top: 1rem;">
                        Apply to Brand Toolkit
                    </button>
                ` : ''}
            `;
            
            if (result.autoApplied) {
                showStatus('Figma data imported and applied successfully!', 'success');
                // Reload content to show updated data
                await loadContent();
                if (result.colors) {
                    renderColorsList(result.colors);
                }
                if (result.typography && result.typography.length > 0) {
                    document.getElementById('font-primary').value = result.typography[0].fontFamily || '';
                    document.getElementById('font-secondary').value = result.typography[1]?.fontFamily || result.typography[0].fontFamily || '';
                }
            } else {
                showStatus('Figma data extracted successfully. Click "Apply" to add to your toolkit.', 'success');
            }
        }
    } catch (error) {
        console.error('Error importing Figma file:', error);
        resultsDiv.innerHTML = `<div style="color: #d32f2f; padding: 1rem; background: #ffebee; border-radius: 4px;">
            <strong>Error:</strong> ${error.message}
        </div>`;
        showStatus(`Error importing Figma file: ${error.message}`, 'error');
    }
}

async function applyFigmaData(data) {
    try {
        const response = await fetch('/api/figma/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                data: data,
                autoApply: true 
            })
        });
        
        const result = await response.json();
        
        if (result.success && result.autoApplied) {
            showStatus('Figma data applied to brand toolkit!', 'success');
            await loadContent();
            if (result.colors) {
                renderColorsList(result.colors);
            }
            if (result.typography && result.typography.length > 0) {
                document.getElementById('font-primary').value = result.typography[0].fontFamily || '';
                document.getElementById('font-secondary').value = result.typography[1]?.fontFamily || result.typography[0].fontFamily || '';
            }
            
            // Update results display
            const resultsDiv = document.getElementById('figma-sync-results');
            if (resultsDiv) {
                const existing = resultsDiv.innerHTML;
                resultsDiv.innerHTML = existing.replace(
                    /Apply to Brand Toolkit/,
                    '<strong style="color: #2e7d32;">✓ Applied to Brand Toolkit!</strong>'
                );
            }
        }
    } catch (error) {
        console.error('Error applying Figma data:', error);
        showStatus(`Error applying data: ${error.message}`, 'error');
    }
}

// Delete asset
async function deleteAsset(id) {
    if (!confirm('Are you sure you want to delete this asset?')) return;
    
    try {
        const response = await fetch(`/api/assets/${id}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        if (result.success) {
            await loadContent();
            showStatus('Asset deleted successfully', 'success');
        }
    } catch (error) {
        console.error('Error deleting asset:', error);
        showStatus('Error deleting asset', 'error');
    }
}

// Logo preview is now handled inline in populateForm

// Helper to upload image and get URL
async function uploadImageFile(file) {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await fetch('/api/assets', {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) {
        throw new Error('Failed to upload image');
    }
    
    const result = await response.json();
    if (result.success && result.asset && result.asset.url) {
        return result.asset.url;
    }
    throw new Error('Invalid response from server');
}

// Helper to get image from file input (returns URL, supports both base64 and URLs for backward compatibility)
function getImageFromInput(input, existingValue = '') {
    return new Promise(async (resolve) => {
        try {
            if (!input) {
                resolve(existingValue);
                return;
            }
            
            // Check if there's a URL stored on the input (from previous upload)
            const imageUrl = input.getAttribute('data-image-url');
            if (imageUrl && imageUrl.trim().length > 0) {
                console.log('Using stored image URL from input');
                resolve(imageUrl);
                return;
            }
            
            // Check for legacy base64 data (backward compatibility)
            const base64Data = input.getAttribute('data-base64');
            if (base64Data && base64Data.trim().length > 0 && base64Data.startsWith('data:')) {
                console.log('Using stored base64 data from input (legacy)');
                resolve(base64Data);
                return;
            }
            
            // Check if there's a file currently selected - upload it
            if (input.files && input.files[0]) {
                console.log('Uploading file from input:', input.files[0].name);
                try {
                    const url = await uploadImageFile(input.files[0]);
                    // Store the URL on the input for future saves
                    input.setAttribute('data-image-url', url);
                    console.log('File uploaded successfully, URL:', url);
                    resolve(url);
                    return;
                } catch (err) {
                    console.warn('Error uploading file, preserving existing image:', err);
                    resolve(existingValue);
                    return;
                }
            }
            
            // Otherwise use existing value (preserve existing image - supports both URLs and base64)
            console.log('No new file, using existing value');
            resolve(existingValue);
        } catch (error) {
            console.error('Error in getImageFromInput, preserving existing value:', error);
            resolve(existingValue); // Always preserve existing on error
        }
    });
}

// Rebuild currentContent from form (helper for change tracking)
async function rebuildContentFromForm() {
    // This is the same logic as saveContentFull but just rebuilds currentContent
    // Helper to get existing image value
    function getExistingImage(path) {
        try {
            if (!currentContent) return '';
            const keys = path.split('.');
            let value = currentContent;
            for (const key of keys) {
                value = value?.[key];
            }
            return value || '';
        } catch {
            return '';
        }
    }
    
    // Helper to safely get element value
    function getValue(id, defaultValue = '') {
        const el = document.getElementById(id);
        if (!el) {
            console.warn(`Element not found: ${id}`);
            return defaultValue;
        }
        return el.value !== null && el.value !== undefined ? el.value : defaultValue;
    }
    
    // Helper to get hero image from input (synchronous for URL-based images)
    function getHeroImageFromInput(input, existingImage) {
        if (!input) return existingImage || '';
        // Check if there's a data-image-url attribute (from upload)
        const imageUrl = input.getAttribute('data-image-url');
        if (imageUrl) return imageUrl;
        // Otherwise return existing image
        return existingImage || '';
    }
    
    // Get logo SVG from textarea
    const logoValue = getValue('logo-upload', '');
    
    currentContent = {
        brandName: getValue('brand-name'),
        logo: logoValue,
        colors: getColorsFromForm(),
        typography: {
            primary: getValue('font-primary'),
            secondary: getValue('font-secondary')
        },
        frameRebel: {
            image: getHeroImageFromInput(document.querySelector('[data-section="frameRebel"].section-hero-image-input'), getExistingImage('frameRebel.image')),
            aboutTheProject: {
                image: await getImageFromInput(document.querySelector('[data-section="frameRebel"][data-subsection="aboutTheProject"]'), getExistingImage('frameRebel.aboutTheProject.image')),
                content: getValue('frame-rebel-about-content')
            },
            fundamentalPillars: {
                image: await getImageFromInput(document.querySelector('[data-section="frameRebel"][data-subsection="fundamentalPillars"]'), getExistingImage('frameRebel.fundamentalPillars.image')),
                content: getValue('frame-rebel-pillars-content')
            },
            toneOfVoice: {
                image: await getImageFromInput(document.querySelector('[data-section="frameRebel"][data-subsection="toneOfVoice"]'), getExistingImage('frameRebel.toneOfVoice.image')),
                content: getValue('frame-rebel-tone-content')
            }
        },
        logotype: {
            image: getHeroImageFromInput(document.querySelector('[data-section="logotype"].section-hero-image-input'), getExistingImage('logotype.image')),
            mainLogo: await getImageFromInput(document.getElementById('main-logo-upload'), getExistingImage('logotype.mainLogo')),
            subsections: await getLogotypeSubsectionsFromForm()
        },
        color: {
            image: getHeroImageFromInput(document.querySelector('[data-section="color"].section-hero-image-input'), getExistingImage('color.image')),
            corporateColors: {
                content: getValue('color-corporate-content')
            },
            correctApplications: {
                content: getValue('color-correct-content')
            },
            monochromatic: {
                content: getValue('color-monochromatic-content')
            },
            incorrectApplications: {
                content: getValue('color-incorrect-content')
            }
        },
        typographySection: {
            image: getHeroImageFromInput(document.querySelector('[data-section="typographySection"].section-hero-image-input'), getExistingImage('typographySection.image')),
            mainTypography: {
                image: await getImageFromInput(document.querySelector('[data-section="typographySection"][data-subsection="mainTypography"]'), getExistingImage('typographySection.mainTypography.image')),
                content: getValue('typography-main-content')
            },
            secondaryTypography: {
                image: await getImageFromInput(document.querySelector('[data-section="typographySection"][data-subsection="secondaryTypography"]'), getExistingImage('typographySection.secondaryTypography.image')),
                content: getValue('typography-secondary-content')
            },
        },
        applications: await getApplicationsFromForm(),
        hiddenSections: currentContent?.hiddenSections || {},
        assets: currentContent?.assets || []
    };
}

// Save specific section - NEW FUNCTION
async function saveSection(sectionPath, sectionData) {
    showStatus(`Saving ${sectionPath}...`, 'loading');
    try {
        const response = await fetch(`/api/content/section/${sectionPath}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sectionData)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server error (${response.status}): ${errorText}`);
        }
        
        const result = await response.json();
        if (result.success || result.content) {
            currentContent = result.content || currentContent;
            showStatus(`${sectionPath} saved successfully!`, 'success');
            // Optionally reload content to sync with server
            // await loadContent();
            return true;
        } else {
            throw new Error('Save returned unsuccessful result');
        }
    } catch (error) {
        console.error(`Error saving section ${sectionPath}:`, error);
        showStatus(`Error saving ${sectionPath}: ${error.message}. Please try again.`, 'error');
        return false;
    }
}

// Removed duplicate rebuildContentFromForm - using the one above (line 2388)

// Save content - UPDATED FOR NEW STRUCTURE - Now only saves changed sections
async function saveContent() {
    showStatus('Saving changes...', 'loading');
    try {
        // First, rebuild currentContent from form to get latest values
        await rebuildContentFromForm();
        
        // Collect only changed sections
        const sectionsToSave = [];
        
        // Check frameRebel (includes hero image and all subsections)
        if (hasSectionChanged('frameRebel')) {
            sectionsToSave.push({
                path: 'frameRebel',
                data: currentContent.frameRebel
            });
        }
        
        // Check logotype (includes hero image, mainLogo, and subsections)
        if (hasSectionChanged('logotype')) {
            sectionsToSave.push({
                path: 'logotype',
                data: currentContent.logotype
            });
        }
        
        // Check color (includes hero image and all subsections)
        if (hasSectionChanged('color')) {
            sectionsToSave.push({
                path: 'color',
                data: currentContent.color
            });
        }
        
        // Check typographySection (includes hero image and all subsections)
        if (hasSectionChanged('typographySection')) {
            sectionsToSave.push({
                path: 'typographySection',
                data: currentContent.typographySection
            });
        }
        
        // Check applications subsections
        if (hasSectionChanged('applications')) {
            sectionsToSave.push({
                path: 'applications',
                data: currentContent.applications || []
            });
        }
        
        // Check top-level fields
        if (hasSectionChanged('brandName')) {
            sectionsToSave.push({
                path: 'brandName',
                data: currentContent.brandName
            });
        }
        if (hasSectionChanged('logo')) {
            sectionsToSave.push({
                path: 'logo',
                data: currentContent.logo
            });
        }
        
        // If nothing changed, show message and return
        if (sectionsToSave.length === 0) {
            showStatus('No changes to save', 'info');
            return;
        }
        
        // If only a few sections changed, use batch PATCH
        // If many sections changed, use full PUT
        if (sectionsToSave.length <= 5) {
            // Use batch PATCH endpoint
            const response = await fetch('/api/content/sections', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sections: sectionsToSave })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error (${response.status}): ${errorText}`);
            }
            
            const result = await response.json();
            if (result.success || result.content) {
                currentContent = result.content || currentContent;
                showStatus(`Saved ${sectionsToSave.length} section(s) successfully!`, 'success');
                // Reload to sync and reset tracking
                await loadContent();
            } else {
                throw new Error('Save returned unsuccessful result');
            }
        } else {
            // Too many changes, use full PUT (original behavior)
            await saveContentFull();
        }
    } catch (error) {
        console.error('Error saving content:', error);
        showStatus(`Error saving content: ${error.message}. Please try again.`, 'error');
    }
}

// Save full content (original function, renamed for when too many sections changed)
async function saveContentFull() {
    showStatus('Saving all content...', 'loading');
    try {
        // Helper to get existing image value
        function getExistingImage(path) {
            try {
                if (!currentContent) return '';
                const keys = path.split('.');
                let value = currentContent;
                for (const key of keys) {
                    value = value?.[key];
                }
                return value || '';
            } catch {
                return '';
            }
        }
        
        // Helper to safely get element value
        function getValue(id, defaultValue = '') {
            const el = document.getElementById(id);
            if (!el) {
                console.warn(`Element not found: ${id}`);
                return defaultValue;
            }
            // For textarea elements, preserve the full value including whitespace and newlines
            return el.value !== null && el.value !== undefined ? el.value : defaultValue;
        }
        
        // Helper to get hero image from input (synchronous for URL-based images)
        function getHeroImageFromInput(input, existingImage) {
            if (!input) return existingImage || '';
            // Check if there's a data-image-url attribute (from upload)
            const imageUrl = input.getAttribute('data-image-url');
            if (imageUrl) return imageUrl;
            // Otherwise return existing image
            return existingImage || '';
        }
        
        // Get logo SVG from textarea
        const logoValue = getValue('logo-upload', '');
        
        const content = {
            brandName: getValue('brand-name'),
            logo: logoValue,
            colors: getColorsFromForm(),
            typography: {
                primary: getValue('font-primary'),
                secondary: getValue('font-secondary')
            },
            // 00. The Name of the Project (introduction content is now merged into aboutTheProject)
            frameRebel: {
                image: getHeroImageFromInput(document.querySelector('[data-section="frameRebel"].section-hero-image-input'), getExistingImage('frameRebel.image')),
                aboutTheProject: {
                    image: await getImageFromInput(document.querySelector('[data-section="frameRebel"][data-subsection="aboutTheProject"]'), getExistingImage('frameRebel.aboutTheProject.image')),
                    content: getValue('frame-rebel-about-content')
                },
                fundamentalPillars: {
                    image: await getImageFromInput(document.querySelector('[data-section="frameRebel"][data-subsection="fundamentalPillars"]'), getExistingImage('frameRebel.fundamentalPillars.image')),
                    content: getValue('frame-rebel-pillars-content')
                },
                toneOfVoice: {
                    image: await getImageFromInput(document.querySelector('[data-section="frameRebel"][data-subsection="toneOfVoice"]'), getExistingImage('frameRebel.toneOfVoice.image')),
                    content: getValue('frame-rebel-tone-content')
                }
            },
            logotype: {
                image: getHeroImageFromInput(document.querySelector('[data-section="logotype"].section-hero-image-input'), getExistingImage('logotype.image')),
                mainLogo: await getImageFromInput(document.getElementById('main-logo-upload'), getExistingImage('logotype.mainLogo')),
                subsections: await getLogotypeSubsectionsFromForm()
            },
            color: {
                image: getHeroImageFromInput(document.querySelector('[data-section="color"].section-hero-image-input'), getExistingImage('color.image')),
                corporateColors: {
                    content: getValue('color-corporate-content')
                },
                correctApplications: {
                    content: getValue('color-correct-content')
                },
                monochromatic: {
                    content: getValue('color-monochromatic-content')
                },
                incorrectApplications: {
                    content: getValue('color-incorrect-content')
                }
            },
            typographySection: {
                image: getHeroImageFromInput(document.querySelector('[data-section="typographySection"].section-hero-image-input'), getExistingImage('typographySection.image')),
                mainTypography: {
                    image: await getImageFromInput(document.querySelector('[data-section="typographySection"][data-subsection="mainTypography"]'), getExistingImage('typographySection.mainTypography.image')),
                    content: getValue('typography-main-content')
                },
                secondaryTypography: {
                    image: await getImageFromInput(document.querySelector('[data-section="typographySection"][data-subsection="secondaryTypography"]'), getExistingImage('typographySection.secondaryTypography.image')),
                    content: getValue('typography-secondary-content')
                },
            },
            applications: await getApplicationsFromForm(),
            hiddenSections: currentContent?.hiddenSections || {},
            assets: currentContent?.assets || []
        };
        
        const response = await fetch('/api/content', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(content)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server error (${response.status}): ${errorText}`);
        }
        
        const result = await response.json();
        if (result.success || result.content) {
            currentContent = result.content || content;
            showStatus('Content saved successfully!', 'success');
            await loadContent();
        } else {
            throw new Error('Save returned unsuccessful result');
        }
    } catch (error) {
        console.error('Error saving content:', error);
        showStatus(`Error saving content: ${error.message}. Please try again.`, 'error');
    }
}

// Get section data from form - Helper function to extract specific section data
async function getSectionDataFromForm(sectionPath) {
    // Helper to get existing image value
    function getExistingImage(path) {
        try {
            if (!currentContent) return '';
            const keys = path.split('.');
            let value = currentContent;
            for (const key of keys) {
                value = value?.[key];
            }
            return value || '';
        } catch {
            return '';
        }
    }
    
    // Helper to safely get element value
    function getValue(id, defaultValue = '') {
        const el = document.getElementById(id);
        if (!el) return defaultValue;
        return el.value !== null && el.value !== undefined ? el.value : defaultValue;
    }
    
    // Extract section data based on path
    const pathParts = sectionPath.split('.');
    const section = pathParts[pathParts.length - 1];
    const parentSection = pathParts.length > 1 ? pathParts[pathParts.length - 2] : null;
    
    // Handle frameRebel subsections
    if (parentSection === 'frameRebel') {
        if (section === 'aboutTheProject') {
            return {
                image: await getImageFromInput(document.querySelector('[data-section="frameRebel"][data-subsection="aboutTheProject"]'), getExistingImage('frameRebel.aboutTheProject.image')),
                content: getValue('frame-rebel-about-content')
            };
        } else if (section === 'fundamentalPillars') {
            return {
                image: await getImageFromInput(document.querySelector('[data-section="frameRebel"][data-subsection="fundamentalPillars"]'), getExistingImage('frameRebel.fundamentalPillars.image')),
                content: getValue('frame-rebel-pillars-content')
            };
        } else if (section === 'toneOfVoice') {
            return {
                image: await getImageFromInput(document.querySelector('[data-section="frameRebel"][data-subsection="toneOfVoice"]'), getExistingImage('frameRebel.toneOfVoice.image')),
                content: getValue('frame-rebel-tone-content')
            };
        }
    }
    
    // Handle typographySection subsections
    if (parentSection === 'typographySection') {
        if (section === 'mainTypography') {
            return {
                image: await getImageFromInput(document.querySelector('[data-section="typographySection"][data-subsection="mainTypography"]'), getExistingImage('typographySection.mainTypography.image')),
                content: getValue('typography-main-content')
            };
        } else if (section === 'secondaryTypography') {
            return {
                image: await getImageFromInput(document.querySelector('[data-section="typographySection"][data-subsection="secondaryTypography"]'), getExistingImage('typographySection.secondaryTypography.image')),
                content: getValue('typography-secondary-content')
            };
        }
    }
    
    // Handle color subsections
    if (parentSection === 'color') {
        if (section === 'corporateColors') {
            return { content: getValue('color-corporate-content') };
        } else if (section === 'correctApplications') {
            return { content: getValue('color-correct-content') };
        } else if (section === 'monochromatic') {
            return { content: getValue('color-monochromatic-content') };
        } else if (section === 'incorrectApplications') {
            return { content: getValue('color-incorrect-content') };
        }
    }
    
    // Handle basic info
    if (sectionPath === 'brandName') {
        return getValue('brand-name');
    }
    
    if (sectionPath === 'logo') {
        return getValue('logo-upload');
    }
    
    throw new Error(`Unknown section path: ${sectionPath}`);
}

// Show status message
function showStatus(message, type = 'info') {
    const status = document.getElementById('save-status');
    status.textContent = message;
    status.className = `save-status ${type}`;
    status.style.display = 'block';
    
    // Only auto-hide if it's not a loading message
    if (type !== 'loading') {
        setTimeout(() => {
            status.style.display = 'none';
        }, 3000);
    }
}

// Navigation - Smooth scrolling like frontend (using event delegation)
let adminNavInitialized = false;
function initAdminSmoothScrolling() {
    if (adminNavInitialized) return;
    
    const adminSidebarNav = document.querySelector('.admin-sidebar-nav');
    if (!adminSidebarNav) {
        setTimeout(initAdminSmoothScrolling, 100);
        return;
    }
    
    adminSidebarNav.addEventListener('click', function(e) {
        const link = e.target.closest('.admin-nav-link');
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
                
                // Update active nav link (only for main sections, not subsections)
                if (!link.classList.contains('subsection-link')) {
                    document.querySelectorAll('.admin-nav-link:not(.subsection-link)').forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                }
                
                // Load typography data when navigating to typography section
                const sectionId = link.getAttribute('data-section');
                if (sectionId === 'typography') {
                    setTimeout(() => {
                        loadTypography();
                    }, 100);
                }
            }
        }
    });
    
    adminNavInitialized = true;
}

// Scroll spy to highlight active navigation item
function initAdminScrollSpy() {
    const sections = document.querySelectorAll('.admin-section');
    const navLinks = document.querySelectorAll('.admin-nav-link');
    
    function updateActiveNav() {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 150;
            const sectionHeight = section.offsetHeight;
            if (window.pageYOffset >= sectionTop && window.pageYOffset < sectionTop + sectionHeight) {
                current = section.getAttribute('id').replace('section-', '');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-section') === current) {
                link.classList.add('active');
            }
        });
    }
    
    window.addEventListener('scroll', updateActiveNav);
    updateActiveNav(); // Initial check
}

// Initialize scroll spy on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminScrollSpy);
} else {
    initAdminScrollSpy();
}

// Section order mapping (matching new structure)
const SECTION_ORDER = [
    { id: 'frame-rebel', name: 'The Name of the Project', useBrandName: true },
    { id: 'logotype', name: 'Logotype' },
    { id: 'color', name: 'Color' },
    { id: 'typography', name: 'Typography' },
    { id: 'applications', name: 'Applications' }
];

// Renumber sections based on visibility
function renumberSections() {
    if (!currentContent) return;
    
    const hiddenSections = currentContent.hiddenSections || {};
    let visibleNumber = 0; // Start at 0 for "00. The Name of the Project"
    const brandName = currentContent.brandName || 'The Name of the Project';
    
    // Update section headers and nav links
    SECTION_ORDER.forEach(section => {
        const isHidden = hiddenSections[section.id];
        const sectionElement = document.getElementById(`section-${section.id}`);
        const navLink = document.querySelector(`.admin-nav-link[data-section="${section.id}"]`);
        
        if (!isHidden) {
            // Update section header
            if (sectionElement) {
                const header = sectionElement.querySelector('.admin-section-header h2');
                if (header) {
                    // Special handling for frame-rebel to use brand name
                    if (section.useBrandName) {
                        // For frame-rebel, replace the entire header text with brand name
                        header.textContent = `${String(visibleNumber).padStart(2, '0')}. ${brandName}`;
                    } else {
                        // Get the section name (everything after the number)
                        const currentText = header.textContent.replace(/^\d+\.\s*/, '');
                        header.textContent = `${String(visibleNumber).padStart(2, '0')}. ${currentText}`;
                    }
                }
            }
            
            // Update nav link
            if (navLink) {
                // Special handling for frame-rebel to use brand name
                if (section.useBrandName) {
                    navLink.textContent = `${String(visibleNumber).padStart(2, '0')}. ${brandName}`;
                } else {
                    // Get the section name (everything after the number)
                    const linkText = navLink.textContent.replace(/^\d+\.\s*/, '');
                    navLink.textContent = `${String(visibleNumber).padStart(2, '0')}. ${linkText}`;
                }
            }
            
            visibleNumber++;
        }
    });
}

// Toggle section visibility
async function toggleSectionVisibility(sectionId, hidden) {
    try {
        const response = await fetch(`/api/sections/${sectionId}/visibility`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hidden })
        });
        const result = await response.json();
        if (result.success) {
            // Update currentContent
            if (!currentContent.hiddenSections) {
                currentContent.hiddenSections = {};
            }
            currentContent.hiddenSections[sectionId] = hidden;
            
            // Renumber sections
            renumberSections();
            
            showStatus(`Section ${hidden ? 'hidden' : 'shown'} successfully`, 'success');
        }
    } catch (error) {
        console.error('Error toggling section visibility:', error);
        showStatus('Error updating section visibility', 'error');
    }
}

// Setup visibility checkboxes
function setupVisibilityControls() {
    document.querySelectorAll('[id^="visibility-"]').forEach(checkbox => {
        if (!checkbox.hasAttribute('data-listener-added')) {
            checkbox.setAttribute('data-listener-added', 'true');
            checkbox.addEventListener('change', function() {
                const sectionId = this.dataset.section;
                const hidden = !this.checked;
                toggleSectionVisibility(sectionId, hidden);
            });
        }
    });
}

// Helper function to wrap file inputs with styled upload component
function wrapFileInputWithStyledUpload(input) {
    // Skip if already wrapped
    if (input.closest('.file-upload-wrapper')) {
        return;
    }
    
    // Generate unique ID if not present
    if (!input.id) {
        input.id = `file-input-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Store original parent before we move the input
    const originalParent = input.parentNode;
    
    const wrapper = document.createElement('div');
    wrapper.className = 'file-upload-wrapper';
    
    const label = document.createElement('label');
    label.className = 'file-upload-label';
    label.setAttribute('for', input.id);
    
    // Check if there's an existing preview with an image (for pre-loaded images)
    let hasExistingImage = false;
    const subsection = input.dataset.subsection;
    const section = input.dataset.section;
    let previewId = '';
    
    if (section === 'typographySection') {
        const camelToKebab = (str) => str.replace(/([A-Z])/g, '-$1').toLowerCase();
        previewId = `typography-${camelToKebab(subsection)}-preview`;
    } else if (section === 'frameRebel') {
        const camelToKebab = (str) => str.replace(/([A-Z])/g, '-$1').toLowerCase();
        previewId = `frame-rebel-${camelToKebab(subsection)}-preview`;
    } else if (section === 'color') {
        const camelToKebab = (str) => str.replace(/([A-Z])/g, '-$1').toLowerCase();
        previewId = `color-${camelToKebab(subsection)}-preview`;
    } else if (input.classList.contains('logo-image-input')) {
        previewId = `logo-${subsection}-preview`;
    }
    
    const preview = document.getElementById(previewId);
    if (preview && preview.querySelector('img')) {
        hasExistingImage = true;
    }
    
    label.innerHTML = `
        <span class="upload-icon">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 15V3M12 3L8 7M12 3L16 7M2 17L2 19C2 20.1046 2.89543 21 4 21L20 21C21.1046 21 22 20.1046 22 19L22 17" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </span>
        <span class="upload-text">${hasExistingImage ? 'Change Image' : 'Upload images/videos'}</span>
        <span class="upload-hint">Click to browse, or drag & drop files here</span>
    `;
    
    if (hasExistingImage) {
        label.classList.add('has-file');
    }
    
    const filenameDisplay = document.createElement('div');
    filenameDisplay.className = 'file-name-display';
    
    // Update input classes - preserve original classes for identification
    const originalClasses = Array.from(input.classList);
    input.classList.remove('form-control');
    input.classList.add('file-upload-input');
    originalClasses.forEach(cls => {
        if (cls.includes('section-image-input') || cls.includes('logo-image-input')) {
            input.classList.add(cls);
        }
    });
    
    // Build wrapper structure (without input first)
    wrapper.appendChild(label);
    wrapper.appendChild(filenameDisplay);
    
    // Replace input with wrapper in original parent
    originalParent.insertBefore(wrapper, input);
    
    // Now move input into wrapper
    input.remove();
    wrapper.insertBefore(input, filenameDisplay);
}

// Initialize styled file uploads on page load
function initializeStyledFileUploads() {
    // Wrap all file inputs except application-image-input (they have their own styling)
    document.querySelectorAll('input[type="file"]:not(.file-upload-input):not(.application-image-input)').forEach(input => {
        try {
            wrapFileInputWithStyledUpload(input);
        } catch (error) {
            console.error('Error wrapping file input:', error, input);
        }
    });
}

// Helper function to render image preview with remove button
function renderImagePreview(imageSrc, previewId, input) {
    const inputId = input ? (input.id || `${previewId}-input`) : `${previewId}-input`;
    return `
        <div style="position: relative; display: inline-block; margin-top: 1rem;">
            <img src="${imageSrc}" alt="Preview" style="max-width: 100%; max-height: 300px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <button type="button" class="remove-image-btn" data-input-id="${inputId}" data-preview-id="${previewId}" style="position: absolute; top: 8px; right: 8px; background: rgba(255, 0, 0, 0.8); color: white; border: none; border-radius: 50%; width: 28px; height: 28px; cursor: pointer; font-size: 16px; line-height: 1; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: background 0.2s;" onmouseover="this.style.background='rgba(255, 0, 0, 1)'" onmouseout="this.style.background='rgba(255, 0, 0, 0.8)'" title="Remove image">×</button>
        </div>
    `;
}

// Remove image function
function removeImage(input, previewId) {
    // Clear the file input
    if (input) {
        input.value = '';
        input.removeAttribute('data-base64');
        
        // Reset styled upload UI
        const wrapper = input.closest('.file-upload-wrapper');
        if (wrapper) {
            const label = wrapper.querySelector('.file-upload-label');
            const filenameDisplay = wrapper.querySelector('.file-name-display');
            if (label) {
                label.classList.remove('has-file');
                const uploadText = label.querySelector('.upload-text');
                if (uploadText) {
                    uploadText.textContent = 'Upload images/videos';
                }
            }
            if (filenameDisplay) {
                filenameDisplay.textContent = '';
                filenameDisplay.style.display = 'none';
            }
        }
    }
    
    // Clear the preview
    const preview = document.getElementById(previewId);
    if (preview) {
        preview.innerHTML = '';
    }
}

// Setup event delegation for all remove image buttons
let removeImageButtonsSetup = false;
function setupRemoveImageButtons() {
    // Only setup once to avoid duplicate event listeners
    if (removeImageButtonsSetup) return;
    removeImageButtonsSetup = true;
    
    // Use event delegation on the document body to handle all remove buttons
    document.body.addEventListener('click', function(e) {
        if (e.target && e.target.classList.contains('remove-image-btn')) {
            e.preventDefault();
            e.stopPropagation();
            
            const btn = e.target;
            const previewId = btn.getAttribute('data-preview-id');
            const inputId = btn.getAttribute('data-input-id');
            
            if (!previewId) return;
            
            // Try to find the input element
            let input = null;
            if (inputId) {
                input = document.getElementById(inputId);
            }
            
            // If not found by ID, try to find by data attributes based on preview ID
            if (!input && previewId) {
                // Try different patterns based on preview ID
                if (previewId.startsWith('frame-rebel-')) {
                    const subsection = previewId.replace('frame-rebel-', '').replace('-preview', '');
                    const camelCase = subsection.split('-').map((word, i) => 
                        i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
                    ).join('');
                    input = document.querySelector(`[data-section="frameRebel"][data-subsection="${camelCase}"]`);
                } else if (previewId.startsWith('logo-')) {
                    const subsection = previewId.replace('logo-', '').replace('-preview', '');
                    input = document.querySelector(`.logo-image-input[data-subsection="${subsection}"]`);
                } else if (previewId.startsWith('color-')) {
                    const subsection = previewId.replace('color-', '').replace('-preview', '');
                    const camelCase = subsection.split('-').map((word, i) => 
                        i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
                    ).join('');
                    input = document.querySelector(`[data-section="color"][data-subsection="${camelCase}"]`);
                } else if (previewId.startsWith('typography-')) {
                    const subsection = previewId.replace('typography-', '').replace('-preview', '');
                    const camelCase = subsection.split('-').map((word, i) => 
                        i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
                    ).join('');
                    input = document.querySelector(`[data-section="typographySection"][data-subsection="${camelCase}"]`);
                } else if (previewId.startsWith('application-preview-')) {
                    const index = previewId.replace('application-preview-', '');
                    input = document.getElementById(`application-image-${index}`);
                }
            }
            
            removeImage(input, previewId);
        }
    });
}

// Setup hero image upload handlers for main sections
function setupHeroImageUploadHandlers() {
    document.querySelectorAll('.section-hero-image-input').forEach(input => {
        if (!input.hasAttribute('data-handler-added')) {
            input.setAttribute('data-handler-added', 'true');
            input.addEventListener('change', async function(e) {
                const file = e.target.files[0];
                if (!file) return;
                
                const section = input.dataset.section;
                let previewId = '';
                
                // Determine preview ID based on section
                if (section === 'frameRebel') {
                    previewId = 'frame-rebel-hero-preview';
                } else if (section === 'logotype') {
                    previewId = 'logotype-hero-preview';
                } else if (section === 'color') {
                    previewId = 'color-hero-preview';
                } else if (section === 'typographySection') {
                    previewId = 'typography-hero-preview';
                } else if (section === 'applications') {
                    previewId = 'applications-hero-preview';
                }
                
                // Upload file to server using the same method as subsection images
                try {
                    const url = await uploadImageFile(file);
                    
                    // Store URL on input for later use
                    input.setAttribute('data-image-url', url);
                    
                    // Update preview
                    const preview = document.getElementById(previewId);
                    if (preview) {
                        preview.innerHTML = `
                            <div style="position: relative; display: inline-block; margin-top: 1rem;">
                                <img src="${url}" alt="Preview" style="max-width: 100%; max-height: 300px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                                <button type="button" class="remove-image-btn" data-input-id="${input.id}" data-preview-id="${previewId}" style="position: absolute; top: 8px; right: 8px; background: rgba(255, 0, 0, 0.8); color: white; border: none; border-radius: 50%; width: 28px; height: 28px; cursor: pointer; font-size: 16px; line-height: 1; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);" title="Remove image">×</button>
                            </div>
                        `;
                        
                        // Attach remove handler
                        const removeBtn = preview.querySelector('.remove-image-btn');
                        if (removeBtn) {
                            removeBtn.addEventListener('click', function() {
                                removeImage(input, previewId);
                            });
                        }
                    }
                    
                    // Track section change - use the section name directly for hero images
                    if (section === 'frameRebel') {
                        trackSectionChange('frameRebel');
                    } else if (section === 'logotype') {
                        trackSectionChange('logotype');
                    } else if (section === 'color') {
                        trackSectionChange('color');
                    } else if (section === 'typographySection') {
                        trackSectionChange('typographySection');
                    } else if (section === 'applications') {
                        trackSectionChange('applications');
                    }
                    showStatus('Hero image uploaded successfully', 'success');
                } catch (error) {
                    console.error('Error uploading hero image:', error);
                    showStatus(`Error uploading hero image: ${error.message}`, 'error');
                }
            });
        }
    });
}

// Setup image upload handlers
function setupImageUploadHandlers() {
    document.querySelectorAll('.section-image-input, .logo-image-input, .file-upload-input').forEach(input => {
        if (!input.hasAttribute('data-handler-added')) {
            input.setAttribute('data-handler-added', 'true');
            input.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (!file) return;
                
                // Update styled upload label
                const wrapper = input.closest('.file-upload-wrapper');
                if (wrapper) {
                    const label = wrapper.querySelector('.file-upload-label');
                    const filenameDisplay = wrapper.querySelector('.file-name-display');
                    if (label) {
                        label.classList.add('has-file');
                        const uploadText = label.querySelector('.upload-text');
                        if (uploadText) {
                            uploadText.textContent = 'Change Image';
                        }
                    }
                    if (filenameDisplay) {
                        filenameDisplay.textContent = file.name;
                        filenameDisplay.style.display = 'block';
                    }
                }
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    const base64 = e.target.result;
                    input.setAttribute('data-base64', base64);
                    
                    // Find preview element
                    const subsection = input.dataset.subsection;
                    const section = input.dataset.section;
                    let previewId = '';
                    
                    if (section === 'typographySection') {
                        const camelToKebab = (str) => str.replace(/([A-Z])/g, '-$1').toLowerCase();
                        previewId = `typography-${camelToKebab(subsection)}-preview`;
                    } else if (section === 'frameRebel') {
                        const camelToKebab = (str) => str.replace(/([A-Z])/g, '-$1').toLowerCase();
                        previewId = `frame-rebel-${camelToKebab(subsection)}-preview`;
                    } else if (section === 'color') {
                        const camelToKebab = (str) => str.replace(/([A-Z])/g, '-$1').toLowerCase();
                        previewId = `color-${camelToKebab(subsection)}-preview`;
                    } else if (section === 'applications') {
                        const camelToKebab = (str) => str.replace(/([A-Z])/g, '-$1').toLowerCase();
                        previewId = `applications-${camelToKebab(subsection)}-preview`;
                    } else if (section === 'explanation') {
                        previewId = `explanation-${subsection}-preview`;
                    } else if (!section) {
                        // Logo subsections
                        previewId = `logo-${subsection}-preview`;
                    } else if (input.classList.contains('logo-image-input')) {
                        // Logo image inputs (no section attribute)
                        previewId = `logo-${subsection}-preview`;
                    }
                    
                    const preview = document.getElementById(previewId);
                    if (preview) {
                        preview.innerHTML = renderImagePreview(base64, previewId, input);
                        
                        // Attach remove handler
                        const removeBtn = preview.querySelector('.remove-image-btn');
                        if (removeBtn) {
                            removeBtn.addEventListener('click', function() {
                                removeImage(input, previewId);
                            });
                        }
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    });
}

// Typography Management Functions
let typographyData = { fonts: [], typography: {} };

// Current device preview mode
let currentDevice = 'desktop';

// Load typography data
async function loadTypography() {
    try {
        const response = await fetch('/api/typography');
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Response error:', response.status, errorText);
            throw new Error(`Failed to load typography: ${response.status}`);
        }
        const data = await response.json();
        typographyData = data;
        console.log('Loaded typography data:', typographyData); // Debug
        renderFontsList();
    } catch (error) {
        console.error('Error loading typography:', error);
        showStatus(`Error loading typography data: ${error.message}`, 'error');
    }
}

// Switch device preview
function switchDevice(device) {
    currentDevice = device;
    
    // Update button states
    document.querySelectorAll('.device-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.device === device) {
            btn.classList.add('active');
        }
    });
    
    // Update preview area
    const previewArea = document.getElementById('typography-preview');
    if (previewArea) {
        previewArea.setAttribute('data-device', device);
        renderTypographyPreview();
    }
}

// Render typography preview
function renderTypographyPreview() {
    const previewArea = document.getElementById('typography-preview');
    if (!previewArea) return;
    
    const { fonts = [], typography = {} } = typographyData;
    
    // Get font family for each style
    function getFontFamily(styleName) {
        const styleConfig = typography[styleName];
        if (!styleConfig || !styleConfig.fontId) return '';
        
        const font = fonts.find(f => f.id === styleConfig.fontId);
        if (!font) return '';
        
        // Extract font family name from filename
        let fontFamily = font.fontFamily;
        if (!fontFamily) {
            const name = font.originalName || font.filename;
            fontFamily = name.replace(/\.(otf|ttf|woff|woff2|eot)$/i, '').replace(/[-_]/g, ' ');
            // Capitalize first letter of each word
            fontFamily = fontFamily.split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join(' ');
        }
        return fontFamily;
    }
    
    // Typography style specifications
    const styleSpecs = {
        desktop: {
            display: { fontSize: '96px', lineHeight: '100%', letterSpacing: '-0.02em' },
            heading1: { fontSize: '60px', lineHeight: '100%', letterSpacing: '-0.01em' },
            heading2: { fontSize: '42px', lineHeight: '110%', letterSpacing: '-0.01em' },
            heading3: { fontSize: '32px', lineHeight: '120%', letterSpacing: '-0.01em' },
            heading4: { fontSize: '24px', lineHeight: '120%', letterSpacing: '0' },
            body1: { fontSize: '20px', lineHeight: '124%', letterSpacing: '0' },
            body2: { fontSize: '16px', lineHeight: '124%', letterSpacing: '0' },
            button: { fontSize: '16px', lineHeight: '124%', letterSpacing: '0.01em' },
            tag: { fontSize: '16px', lineHeight: '124%', letterSpacing: '0.01em' },
            caption: { fontSize: '12px', lineHeight: '140%', letterSpacing: '0.04em' }
        },
        tablet: {
            display: { fontSize: '72px', lineHeight: '100%', letterSpacing: '-0.02em' },
            heading1: { fontSize: '48px', lineHeight: '100%', letterSpacing: '-0.01em' },
            heading2: { fontSize: '36px', lineHeight: '110%', letterSpacing: '-0.01em' },
            heading3: { fontSize: '28px', lineHeight: '120%', letterSpacing: '-0.01em' },
            heading4: { fontSize: '20px', lineHeight: '120%', letterSpacing: '0' },
            body1: { fontSize: '18px', lineHeight: '124%', letterSpacing: '0' },
            body2: { fontSize: '15px', lineHeight: '124%', letterSpacing: '0' },
            button: { fontSize: '15px', lineHeight: '124%', letterSpacing: '0.01em' },
            tag: { fontSize: '15px', lineHeight: '124%', letterSpacing: '0.01em' },
            caption: { fontSize: '11px', lineHeight: '140%', letterSpacing: '0.04em' }
        },
        mobile: {
            display: { fontSize: '48px', lineHeight: '100%', letterSpacing: '-0.02em' },
            heading1: { fontSize: '36px', lineHeight: '100%', letterSpacing: '-0.01em' },
            heading2: { fontSize: '28px', lineHeight: '110%', letterSpacing: '-0.01em' },
            heading3: { fontSize: '24px', lineHeight: '120%', letterSpacing: '-0.01em' },
            heading4: { fontSize: '18px', lineHeight: '120%', letterSpacing: '0' },
            body1: { fontSize: '16px', lineHeight: '124%', letterSpacing: '0' },
            body2: { fontSize: '14px', lineHeight: '124%', letterSpacing: '0' },
            button: { fontSize: '14px', lineHeight: '124%', letterSpacing: '0.01em' },
            tag: { fontSize: '14px', lineHeight: '124%', letterSpacing: '0.01em' },
            caption: { fontSize: '10px', lineHeight: '140%', letterSpacing: '0.04em' }
        }
    };
    
    const specs = styleSpecs[currentDevice] || styleSpecs.desktop;
    
    const displayFont = getFontFamily('display');
    const headingFont = getFontFamily('heading1') || getFontFamily('heading2') || getFontFamily('heading3');
    const bodyFont = getFontFamily('body1') || getFontFamily('body2');
    
    // Show message if no fonts assigned
    if (fonts.length === 0 || Object.keys(typography).length === 0) {
        previewArea.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #999;">
                <p>Upload fonts and assign them to typography styles to see a preview here.</p>
            </div>
        `;
        previewArea.setAttribute('data-device', currentDevice);
        return;
    }
    
    previewArea.innerHTML = `
        <!-- Display Section -->
        <div class="preview-section">
            <div class="preview-section-header">
                <h4 class="preview-section-title">Display</h4>
                <div class="preview-section-specs">
                    <div class="preview-section-spec">
                        <span>Letter Spacing:</span>
                        <span>${specs.display.letterSpacing}</span>
                    </div>
                    <div class="preview-section-spec">
                        <span>Line Height:</span>
                        <span>${specs.display.lineHeight}</span>
                    </div>
                    <div class="preview-section-spec">
                        <span>Alignment:</span>
                        <span>Left</span>
                    </div>
                </div>
            </div>
            <p class="preview-text preview-display" style="font-family: ${displayFont ? `'${displayFont}'` : 'inherit'}, sans-serif; font-size: ${specs.display.fontSize}; line-height: ${specs.display.lineHeight}; letter-spacing: ${specs.display.letterSpacing};">
                Enjoy your nights without compromise.
            </p>
        </div>
        
        <!-- Heading Section -->
        <div class="preview-section">
            <div class="preview-section-header">
                <h4 class="preview-section-title">Heading</h4>
                <div class="preview-section-specs">
                    <div class="preview-section-spec">
                        <span>Letter Spacing:</span>
                        <span>${specs.heading2.letterSpacing}</span>
                    </div>
                    <div class="preview-section-spec">
                        <span>Line Height:</span>
                        <span>${specs.heading2.lineHeight}</span>
                    </div>
                    <div class="preview-section-spec">
                        <span>Alignment:</span>
                        <span>Left</span>
                    </div>
                </div>
            </div>
            <p class="preview-text preview-heading" style="font-family: ${headingFont ? `'${headingFont}'` : 'inherit'}, sans-serif; font-size: ${specs.heading2.fontSize}; line-height: ${specs.heading2.lineHeight}; letter-spacing: ${specs.heading2.letterSpacing};">
                Valet enables you to enjoy alcohol better. A custom formulation that reduces the negative effects of alcohol consumption. We're here to make drinking a worry-free experience. Made from the highest quality ingredients.
            </p>
        </div>
        
        <!-- Body Section -->
        <div class="preview-section">
            <div class="preview-section-header">
                <h4 class="preview-section-title">Body</h4>
                <div class="preview-section-specs">
                    <div class="preview-section-spec">
                        <span>Letter Spacing:</span>
                        <span>${specs.body1.letterSpacing}</span>
                    </div>
                    <div class="preview-section-spec">
                        <span>Line Height:</span>
                        <span>${specs.body1.lineHeight}</span>
                    </div>
                    <div class="preview-section-spec">
                        <span>Alignment:</span>
                        <span>Left</span>
                    </div>
                </div>
            </div>
            <div class="preview-body-columns">
                ${Array(4).fill(0).map(() => `
                    <p class="preview-text preview-body" style="font-family: ${bodyFont ? `'${bodyFont}'` : 'inherit'}, sans-serif; font-size: ${specs.body1.fontSize}; line-height: ${specs.body1.lineHeight}; letter-spacing: ${specs.body1.letterSpacing};">
                        Enjoy your nights without compromise. For mornings as amazing as your nights. Valet enables you to enjoy alcohol better. A custom formulation that reduces the negative effects of alcohol consumption. We're here to make drinking a worry-free experience. Made from the highest quality ingredients.
                    </p>
                `).join('')}
            </div>
        </div>
        
        <!-- Button Section -->
        ${typography.button ? `
        <div class="preview-section">
            <div class="preview-section-header">
                <h4 class="preview-section-title">Button</h4>
                <div class="preview-section-specs">
                    <div class="preview-section-spec">
                        <span>Letter Spacing:</span>
                        <span>${specs.button.letterSpacing}</span>
                    </div>
                    <div class="preview-section-spec">
                        <span>Line Height:</span>
                        <span>${specs.button.lineHeight}</span>
                    </div>
                </div>
            </div>
            <button class="preview-button" style="font-family: ${getFontFamily('button') ? `'${getFontFamily('button')}'` : 'inherit'}, sans-serif; font-size: ${specs.button.fontSize}; line-height: ${specs.button.lineHeight}; letter-spacing: ${specs.button.letterSpacing};">
                Click Here
            </button>
        </div>
        ` : ''}
        
        <!-- Caption Section -->
        ${typography.caption ? `
        <div class="preview-section">
            <div class="preview-section-header">
                <h4 class="preview-section-title">Caption</h4>
                <div class="preview-section-specs">
                    <div class="preview-section-spec">
                        <span>Letter Spacing:</span>
                        <span>${specs.caption.letterSpacing}</span>
                    </div>
                    <div class="preview-section-spec">
                        <span>Line Height:</span>
                        <span>${specs.caption.lineHeight}</span>
                    </div>
                </div>
            </div>
            <p class="preview-text preview-caption" style="font-family: ${getFontFamily('caption') ? `'${getFontFamily('caption')}'` : 'inherit'}, sans-serif; font-size: ${specs.caption.fontSize}; line-height: ${specs.caption.lineHeight}; letter-spacing: ${specs.caption.letterSpacing};">
                This is a caption text example showing how small text appears.
            </p>
        </div>
        ` : ''}
    `;
    
    previewArea.setAttribute('data-device', currentDevice);
}

// Handle font file upload
async function handleFontUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('fontFile', file);
    
    try {
        showStatus('Uploading font...', 'info');
        const response = await fetch('/api/fonts/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        if (result.success) {
            await loadTypography();
            showStatus('Font uploaded successfully!', 'success');
            event.target.value = ''; // Reset input
        } else {
            showStatus(`Error: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Error uploading font:', error);
        showStatus('Error uploading font', 'error');
    }
}

// Render fonts list
function renderFontsList() {
    const fontsList = document.getElementById('fonts-list');
    if (!fontsList) return;
    
    if (typographyData.fonts.length === 0) {
        fontsList.innerHTML = '<p>No fonts uploaded yet. Upload a font file to get started.</p>';
        return;
    }
    
    fontsList.innerHTML = `
        <h4 style="margin-top: 2rem; margin-bottom: 1rem;">Uploaded Fonts</h4>
        <div class="fonts-grid">
            ${typographyData.fonts.map(font => `
                <div class="font-item">
                    <div class="font-info">
                        <strong>${font.originalName || font.filename}</strong>
                        <small>${(font.size / 1024).toFixed(1)} KB</small>
                    </div>
                    <button class="btn btn-danger btn-small" onclick="deleteFont('${font.id}')">Delete</button>
                </div>
            `).join('')}
        </div>
    `;
}

// Delete font
async function deleteFont(fontId) {
    if (!confirm('Are you sure you want to delete this font? This will also remove it from any typography style assignments.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/fonts/${fontId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        if (result.success) {
            await loadTypography();
            showStatus('Font deleted successfully', 'success');
        } else {
            showStatus(`Error: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Error deleting font:', error);
        showStatus('Error deleting font', 'error');
    }
}


// Hide admin preloader and show content
function hideAdminPreloader() {
    const preloader = document.getElementById('admin-preloader');
    const layout = document.querySelector('.admin-layout');
    
    if (preloader) {
        preloader.classList.add('hidden');
    }
    
    setTimeout(() => {
        if (layout) {
            layout.classList.add('loaded');
        }
    }, 300);
}

// Load content on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Check if we've already authenticated in this session
    const adminAuthenticated = sessionStorage.getItem('adminAuthenticated');
    
    if (adminAuthenticated === 'true') {
        // Skip preloader if already authenticated in this session
        const preloader = document.getElementById('admin-preloader');
        const layout = document.querySelector('.admin-layout');
        if (preloader) {
            preloader.style.display = 'none';
        }
        if (layout) {
            layout.classList.add('loaded');
        }
    }
    
    // Check authentication - this will redirect if not authenticated
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) {
        return; // Will redirect to login
    }
    
    // Mark as authenticated for this session
    sessionStorage.setItem('adminAuthenticated', 'true');
    
    // Hide preloader and show content
    hideAdminPreloader();
    
    // Setup save button
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveContent);
    }
    
    // Track changes on input/textarea/file changes
    document.addEventListener('input', function(e) {
        const input = e.target;
        if (input.hasAttribute('data-section') && input.hasAttribute('data-subsection')) {
            const section = input.getAttribute('data-section');
            const subsection = input.getAttribute('data-subsection');
            trackSectionChange(`${section}.${subsection}`);
        } else if (input.id === 'brand-name') {
            trackSectionChange('brandName');
        } else if (input.id === 'logo-upload') {
            trackSectionChange('logo');
        } else if (input.id && input.id.includes('color-') && input.id.includes('-content')) {
            // Color subsection changes
            if (input.id.includes('corporate')) trackSectionChange('color.corporateColors');
            else if (input.id.includes('correct')) trackSectionChange('color.correctApplications');
            else if (input.id.includes('monochromatic')) trackSectionChange('color.monochromatic');
            else if (input.id.includes('incorrect')) trackSectionChange('color.incorrectApplications');
        } else if (input.id && input.id.includes('typography-') && input.id.includes('-content')) {
            // Typography subsection changes
            if (input.id.includes('main')) trackSectionChange('typographySection.mainTypography');
            else if (input.id.includes('secondary')) trackSectionChange('typographySection.secondaryTypography');
        } else if (input.id && input.id.includes('frame-rebel-') && input.id.includes('-content')) {
            // FrameRebel subsection changes
            if (input.id.includes('about')) trackSectionChange('frameRebel.aboutTheProject');
            else if (input.id.includes('pillars')) trackSectionChange('frameRebel.fundamentalPillars');
            else if (input.id.includes('tone')) trackSectionChange('frameRebel.toneOfVoice');
        }
    });
    
    // Track file input changes
    document.addEventListener('change', function(e) {
        const input = e.target;
        if (input.type === 'file' && input.hasAttribute('data-section') && input.hasAttribute('data-subsection')) {
            const section = input.getAttribute('data-section');
            const subsection = input.getAttribute('data-subsection');
            trackSectionChange(`${section}.${subsection}`);
        }
    });
    
    // Track changes on input/textarea/file changes
    document.addEventListener('input', function(e) {
        const input = e.target;
        if (input.hasAttribute('data-section') && input.hasAttribute('data-subsection')) {
            const section = input.getAttribute('data-section');
            const subsection = input.getAttribute('data-subsection');
            trackSectionChange(`${section}.${subsection}`);
        } else if (input.id === 'brand-name') {
            trackSectionChange('brandName');
        } else if (input.id === 'logo-upload') {
            trackSectionChange('logo');
        } else if (input.id && input.id.includes('color-') && input.id.includes('-content')) {
            // Color subsection changes
            if (input.id.includes('corporate')) trackSectionChange('color.corporateColors');
            else if (input.id.includes('correct')) trackSectionChange('color.correctApplications');
            else if (input.id.includes('monochromatic')) trackSectionChange('color.monochromatic');
            else if (input.id.includes('incorrect')) trackSectionChange('color.incorrectApplications');
        } else if (input.id && input.id.includes('typography-') && input.id.includes('-content')) {
            // Typography subsection changes
            if (input.id.includes('main')) trackSectionChange('typographySection.mainTypography');
            else if (input.id.includes('secondary')) trackSectionChange('typographySection.secondaryTypography');
        } else if (input.id && input.id.includes('frame-rebel-') && input.id.includes('-content')) {
            // FrameRebel subsection changes
            if (input.id.includes('about')) trackSectionChange('frameRebel.aboutTheProject');
            else if (input.id.includes('pillars')) trackSectionChange('frameRebel.fundamentalPillars');
            else if (input.id.includes('tone')) trackSectionChange('frameRebel.toneOfVoice');
        }
    });
    
    // Track file input changes
    document.addEventListener('change', function(e) {
        const input = e.target;
        if (input.type === 'file' && input.hasAttribute('data-section') && input.hasAttribute('data-subsection')) {
            const section = input.getAttribute('data-section');
            const subsection = input.getAttribute('data-subsection');
            trackSectionChange(`${section}.${subsection}`);
        }
    });
    
    loadContent().then(() => {
        setTimeout(() => {
            initializeStyledFileUploads();
            setupHeroImageUploadHandlers(); // Setup hero image handlers for main sections
            setupImageUploadHandlers();
            setupRemoveImageButtons(); // Setup event delegation for remove buttons
            setupLogotypeHandlers(); // Setup logotype handlers (also called in populateForm but ensure it's here too)
            // Load typography data on page load
            loadTypography();
        }, 100);
    });
    
    // Initialize smooth scrolling (uses delegation, so only needs to be called once)
    initAdminSmoothScrolling();
});

