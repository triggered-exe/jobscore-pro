const GEMINI_API_KEY = 'AIzaSyB8YNFOrzbEKeeW9hmn00pEGs_xULKRcxs';

document.addEventListener('DOMContentLoaded', async () => {
    const resumeGrid = document.getElementById('resume-grid');
    const resumeCountSpan = document.getElementById('resume-count');
    const uploadBtn = document.getElementById('upload-btn');
    const fileInput = document.getElementById('resume-upload');
    const dropZone = document.getElementById('drop-zone');
    const statusMessage = document.getElementById('status-message');

    // Load initial state
    await loadResumes();

    // Event Listeners
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileUpload);

    // Drag & Drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    // --- Resume Management ---
    async function loadResumes() {
        const data = await chrome.storage.local.get('resumes');
        const resumes = data.resumes || [];
        renderResumes(resumes);
    }

    function renderResumes(resumes) {
        resumeGrid.innerHTML = '';
        resumeCountSpan.textContent = `${resumes.length}/3`;

        if (resumes.length >= 3) {
            uploadBtn.disabled = true;
            dropZone.style.opacity = '0.6';
            dropZone.style.pointerEvents = 'none';
        } else {
            uploadBtn.disabled = false;
            dropZone.style.opacity = '1';
            dropZone.style.pointerEvents = 'auto';
        }

        resumes.forEach((resume) => {
            const card = document.createElement('div');
            card.className = `resume-card ${resume.isDefault ? 'default' : ''}`;

            card.innerHTML = `
                <div class="card-header">
                    <div class="file-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    </div>
                    <div class="card-info">
                        <h4 title="${resume.name}">${resume.name}</h4>
                        <span>${new Date(resume.timestamp).toLocaleDateString()}</span>
                        <div class="default-badge">Default</div>
                    </div>
                </div>
                <div class="card-actions">
                    <button class="btn-text btn-set-default" data-id="${resume.id}">Set Default</button>
                    <button class="btn-text btn-delete" data-id="${resume.id}">Delete</button>
                </div>
            `;
            resumeGrid.appendChild(card);
        });

        // Attach event listeners
        resumeGrid.querySelectorAll('.btn-set-default').forEach(btn => {
            btn.addEventListener('click', () => setDefaultResume(btn.dataset.id));
        });

        resumeGrid.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => deleteResume(btn.dataset.id));
        });
    }

    function handleFileUpload(event) {
        const file = event.target.files[0];
        handleFile(file);
    }

    async function handleFile(file) {
        if (!file) return;

        // Reset input
        fileInput.value = '';

        const data = await chrome.storage.local.get('resumes');
        const resumes = data.resumes || [];

        if (resumes.length >= 3) {
            showStatus('Maximum 3 resumes allowed', 'error');
            return;
        }

        if (file.type !== 'application/pdf') {
            showStatus('Only PDF files are allowed', 'error');
            return;
        }

        if (GEMINI_API_KEY === 'YOUR_API_KEY_HERE' || !GEMINI_API_KEY) {
            showStatus('API Key is missing. Please configure it in the code.', 'error');
            return;
        }

        try {
            showStatus('Reading file...', 'loading');
            const base64Data = await fileToBase64(file);

            showStatus('Parsing with AI...', 'loading');
            const parsedContent = await parseResumeWithGemini(base64Data, GEMINI_API_KEY);

            const newResume = {
                id: Date.now().toString(),
                name: file.name,
                content: parsedContent,
                timestamp: Date.now(),
                isDefault: resumes.length === 0
            };

            resumes.push(newResume);
            await chrome.storage.local.set({ resumes });

            loadResumes();
            showStatus('Resume uploaded successfully', 'success');

        } catch (error) {
            console.error(error);
            showStatus('Error: ' + error.message, 'error');
        }
    }

    async function setDefaultResume(id) {
        const data = await chrome.storage.local.get('resumes');
        let resumes = data.resumes || [];

        resumes = resumes.map(r => ({
            ...r,
            isDefault: r.id === id
        }));

        await chrome.storage.local.set({ resumes });
        loadResumes();
    }

    async function deleteResume(id) {
        if (!confirm('Are you sure you want to delete this resume?')) return;

        const data = await chrome.storage.local.get('resumes');
        let resumes = data.resumes || [];

        const wasDefault = resumes.find(r => r.id === id)?.isDefault;
        resumes = resumes.filter(r => r.id !== id);

        if (wasDefault && resumes.length > 0) {
            resumes[0].isDefault = true;
        }

        await chrome.storage.local.set({ resumes });
        loadResumes();
        showStatus('Resume deleted', 'success');
    }

    // --- Helpers ---
    function showStatus(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
        statusMessage.classList.remove('hidden');

        if (type !== 'loading') {
            setTimeout(() => {
                statusMessage.classList.add('hidden');
            }, 5000);
        }
    }

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64String = reader.result.split(',')[1];
                resolve(base64String);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async function parseResumeWithGemini(base64Data, apiKey) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{
                parts: [
                    {
                        inline_data: {
                            mime_type: "application/pdf",
                            data: base64Data
                        }
                    },
                    {
                        text: "Parse this provided resume into a markdown format. Preserve the sections as provided in the resume. Keep the information exact dont modify it."
                    }
                ]
            }]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Failed to parse resume with AI');
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error('No content generated by AI');
        }

        return text;
    }
});
