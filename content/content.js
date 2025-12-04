// Content script for LinkedIn Job Match

let currentJobId = null;
let matchCard = null;

// Initialize
init();

function init() {
    console.log('Linkedin Job Match initialized');
    // Initial check
    checkAndProcessJob();

    // Watch for URL changes (LinkedIn is an SPA)
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            checkAndProcessJob();
        }
    }).observe(document, { subtree: true, childList: true });
}

function checkAndProcessJob() {
    const jobId = extractJobId();

    if (!jobId) {
        removeMatchCard();
        return;
    }

    if (jobId !== currentJobId) {
        currentJobId = jobId;
        processJob();
    }
}

function extractJobId() {
    // Extract from URL patterns:
    // https://www.linkedin.com/jobs/view/4323548252/
    // https://www.linkedin.com/jobs/collections/recommended/?currentJobId=4323548252

    const viewMatch = location.pathname.match(/\/jobs\/view\/(\d+)/);
    if (viewMatch) return viewMatch[1];

    const params = new URLSearchParams(location.search);
    const currentJobId = params.get('currentJobId');
    if (currentJobId) return currentJobId;

    return null;
}

async function processJob() {
    try {
        // Show loading state
        showMatchCard({ loading: true });

        // Get default resume
        const resume = await getDefaultResume();
        if (!resume) {
            showMatchCard({
                error: 'No resume found. Please upload a resume in the extension settings.'
            });
            return;
        }

        // Extract job details
        const jobDetails = await extractJobDetails();
        if (!jobDetails) {
            showMatchCard({
                error: 'Could not extract job details. Please try refreshing the page.'
            });
            return;
        }

        // Get match score from AI
        const matchResult = await getMatchScore(resume.content, jobDetails);

        // Show result
        showMatchCard({ result: matchResult });

    } catch (error) {
        console.error('Job match error:', error);
        showMatchCard({
            error: 'Failed to calculate match score. Please try again.'
        });
    }
}

async function getDefaultResume() {
    return new Promise((resolve) => {
        chrome.storage.local.get('resumes', (data) => {
            const resumes = data.resumes || [];
            const defaultResume = resumes.find(r => r.isDefault) || resumes[0];
            resolve(defaultResume);
        });
    });
}

async function extractJobDetails() {
    // Wait for job details to load
    await waitForElement('.jobs-unified-top-card__job-title, .job-details-jobs-unified-top-card__job-title');

    // Wait specifically for description
    await waitForElement('.jobs-box__html-content div');

    const jobTitle = document.querySelector('.jobs-unified-top-card__job-title, .job-details-jobs-unified-top-card__job-title')?.textContent?.trim();

    const companyName = document.querySelector('.jobs-unified-top-card__company-name, .job-details-jobs-unified-top-card__company-name')?.textContent?.trim();

    const descriptionElement = document.querySelector('.jobs-box__html-content div');
    const jobDescription = descriptionElement?.textContent?.trim() || '';

    if (!jobTitle || !jobDescription) {
        return null;
    }

    return {
        title: jobTitle,
        company: companyName || 'Unknown Company',
        description: jobDescription.substring(0, 3000) // Limit to avoid token limits
    };
}

function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const checkElement = () => {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim().length > 0) {
                return element;
            }
            return null;
        };

        const element = checkElement();
        if (element) {
            resolve(element);
            return;
        }

        const observer = new MutationObserver(() => {
            const element = checkElement();
            if (element) {
                observer.disconnect();
                resolve(element);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });

        setTimeout(() => {
            observer.disconnect();
            // If timeout, try one last time or reject
            const element = checkElement();
            if (element) {
                resolve(element);
            } else {
                reject(new Error('Timeout waiting for element content'));
            }
        }, timeout);
    });
}

async function getMatchScore(resumeContent, jobDetails) {
    // Send message to background script to avoid CORS issues
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
            {
                type: 'JOB_MATCH',
                payload: {
                    resumeContent,
                    jobDetails
                }
            },
            (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }

                if (response.success) {
                    resolve(response.data);
                } else {
                    reject(new Error(response.error || 'Failed to get match score'));
                }
            }
        );
    });
}

function showMatchCard({ loading, error, result }) {
    // Remove existing card
    removeMatchCard();

    // Create card
    matchCard = document.createElement('div');
    matchCard.className = 'job-match-card';

    if (loading) {
        matchCard.classList.add('loading');
        matchCard.innerHTML = `
            <div class="job-match-loading">
                <div class="job-match-spinner">
                    <img src="${chrome.runtime.getURL('icon.png')}" alt="JobScore Pro" class="job-match-logo">
                </div>
                <span>JobScore Pro is calculating your match score...</span>
            </div>
        `;
    } else if (error) {
        matchCard.innerHTML = `
            <header class="job-match-header">
                <div class="job-match-title-container">
                    <img src="${chrome.runtime.getURL('icon.png')}" alt="JobScore Pro" class="job-match-header-logo">
                    <h1 class="job-match-title">Job Match Score</h1>
                </div>
                <div class="job-match-header-right">
                </div>
            </header>
            <div class="job-match-error">${error}</div>
        `;
    } else if (result) {
        const scoreLevel = getScoreLevel(result.score);
        matchCard.innerHTML = `
            <header class="job-match-header">
                <div class="job-match-title-container">
                    <img src="${chrome.runtime.getURL('icon.png')}" alt="JobScore Pro" class="job-match-header-logo">
                    <h1 class="job-match-title">JobScore Pro</h1>
                </div>
            </header>
            <div class="job-match-score-container">
                <div class="job-match-score-circle">
                    <span>${result.score}</span>
                </div>
                <div class="job-match-score-label">
                    <p class="job-match-score-text">Match Score</p>
                    <p class="job-match-score-level">${scoreLevel.label} - Confidence: ${result.confidence || 'N/A'}</p>
                </div>
            </div>
            <ul class="job-match-summary">
                ${(result.feedback || []).slice(0,3).map(f => `<li class="job-match-summary-item"><div class="summary-bullet"></div><p class="summary-text">${f}</p></li>`).join('')}
            </ul>
        `;
    }

    // Inject above job description
    const descriptionElement = document.querySelector('.jobs-description__content, .jobs-description');
    if (descriptionElement && descriptionElement.parentElement) {
        matchCard.classList.add('embedded');
        descriptionElement.parentElement.insertBefore(matchCard, descriptionElement);
    } else {
        // Fallback to fixed positioning if description not found
        document.body.appendChild(matchCard);
    }
}

function removeMatchCard() {
    if (matchCard && matchCard.parentElement) {
        matchCard.remove();
    }
    matchCard = null;
}

function getScoreLevel(score) {
    if (score >= 90) return { label: 'Excellent Match', class: 'excellent' };
    if (score >= 70) return { label: 'Good Match', class: 'good' };
    if (score >= 50) return { label: 'Moderate Match', class: 'moderate' };
    if (score >= 30) return { label: 'Weak Match', class: 'weak' };
    return { label: 'Poor Match', class: 'poor' };
}