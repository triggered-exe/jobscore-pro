// Background script for JobScore Pro
// Handles API calls to Lambda (no CORS restrictions in background context)

const LAMBDA_ENDPOINT = 'https://d9okpf4hoh.execute-api.eu-north-1.amazonaws.com/default/gemini_fetch_call';

console.log('JobScore Pro background script loaded');

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request.type);

    if (request.type === 'JOB_MATCH') {
        handleJobMatch(request.payload)
            .then(result => sendResponse({ success: true, data: result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep channel open for async response
    }

    if (request.type === 'RESUME_PARSE') {
        handleResumeParse(request.payload)
            .then(result => sendResponse({ success: true, data: result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep channel open for async response
    }

    return false;
});

/**
 * Handle job matching request
 */
async function handleJobMatch(payload) {
    const { resumeContent, jobDetails } = payload;

    console.log('Calling Lambda for job match...');

    const response = await fetch(LAMBDA_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            type: 'job-match',
            payload: {
                resumeContent,
                jobDetails
            }
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get match score');
    }

    const result = await response.json();
    console.log('Job match result:', result);
    return result;
}

/**
 * Handle resume parsing request
 */
async function handleResumeParse(payload) {
    const { base64Data } = payload;

    console.log('Calling Lambda for resume parse...');

    const response = await fetch(LAMBDA_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            type: 'resume-parse',
            payload: {
                base64Data
            }
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to parse resume');
    }

    const result = await response.json();
    console.log('Resume parse completed');
    return result;
}