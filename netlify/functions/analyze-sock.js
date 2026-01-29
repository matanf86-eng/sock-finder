// Netlify Serverless Function לניתוח גרביים
exports.handler = async (event, context) => {
    // CORS Headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // טיפול ב-OPTIONS (CORS preflight)
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // רק POST מותר
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { image } = JSON.parse(event.body);
        
        if (!image) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'חסרה תמונה' })
            };
        }

        // שליחה ל-Claude API
        const apiKey = process.env.CLAUDE_KEY;
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1000,
                messages: [{
                    role: 'user',
                    content: [
                        {
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: 'image/jpeg',
                                data: image
                            }
                        },
                        {
                            type: 'text',
                            text: 'נתח את הגרב בתמונה. תאר בפירוט: צבעים עיקריים, דוגמאות (פסים, נקודות, וכו\'), טקסטורה, אורך (קרסול/ארוך), וכל פרט ייחודי אחר. תן תיאור קצר וממוקד בעברית שיעזור לזהות את הגרב הזה. השתמש במילים פשוטות וברורות.'
                        }
                    ]
                }]
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'שגיאה בשרת של Claude');
        }

        const data = await response.json();
        
        // החזרת התוצאה
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                analysis: data.content[0].text
            })
        };

    } catch (error) {
        console.error('שגיאה בניתוח גרב:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: error.message || 'שגיאה בניתוח הגרב' 
            })
        };
    }
};
