// Content script for LinkedIn Job Match
const GEMINI_API_KEY = 'AIzaSyB8YNFOrzbEKeeW9hmn00pEGs_xULKRcxs';

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
    const prompt = `You are a professional job matching assistant. Compare the candidate's resume with the job posting and provide a match score.

**Resume:**
${resumeContent}

**Job Details:**
- Title: ${jobDetails.title}
- Company: ${jobDetails.company}
- Description: ${jobDetails.description}

**Your Task:**
1. Analyze how well the candidate's skills, experience, and qualifications match the job requirements
2. Provide a match score from 1-100 where:
   - 90-100: Excellent match
   - 70-89: Good match
   - 50-69: Moderate match
   - 30-49: Weak match
   - 1-29: Poor match
3. Provide exactly 2 bullet points explaining the score:
   - First point: Main strength or positive match factor
   - Second point: Area for improvement, caution, or what's missing

**Response Format (JSON only, no markdown):**
{
  "score": <number 1-100>,
  "summary": ["<first point>", "<second point>"]
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:streamGenerateContent?key=${GEMINI_API_KEY}`;

    const payload = {
        contents: [{
            role: "user",
            parts: [{
                text: prompt
            }]
        }],
        generationConfig: {
            thinkingConfig: {
                thinkingBudget: 0
            }
        }
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
        throw new Error(errorData.error?.message || 'Failed to get match score');
    }

    const data = await response.json();

    let text = '';
    if (Array.isArray(data)) {
        for (const chunk of data) {
            if (chunk.candidates?.[0]?.content?.parts?.[0]?.text) {
                text += chunk.candidates[0].content.parts[0].text;
            }
        }
    } else {
        text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    }

    if (!text) {
        throw new Error('No response from AI');
    }

    // Parse JSON response (remove markdown code blocks if present)
    const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(jsonText);

    return result;
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
                    <p class="job-match-score-level">${scoreLevel.label}</p>
                </div>
            </div>
            <ul class="job-match-summary">
                <li class="job-match-summary-item">
                    <div class="summary-bullet"></div>
                    <p class="summary-text">${result.summary[0]}</p>
                </li>
                <li class="job-match-summary-item">
                    <div class="summary-bullet"></div>
                    <p class="summary-text">${result.summary[1]}</p>
                </li>
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
