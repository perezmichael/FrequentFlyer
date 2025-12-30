'use server';

import { geminiModel } from '@/lib/gemini';

export async function getVibeCheck(eventTitle: string, eventVibes: string[]) {
    try {
        const prompt = `
      You are Benny, the vibe curator of Los Angeles.
      Give me a 1-sentence "Vibe Check" for an event called "${eventTitle}" 
      that has these tags: ${eventVibes.join(', ')}.
      
      Keep it cool, slightly mysterious, and under 20 words.
      Don't use hashtags.
    `;

        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Gemini Error:', error);
        return "The vibes are mysterious... (AI Error)";
    }
}

// ADMIN ACTIONS
import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function approveEvent(id: string) {
    await supabase.from('events').update({ status: 'approved' }).eq('id', id);
    revalidatePath('/');
    revalidatePath('/admin');
}

export async function rejectEvent(id: string) {
    await supabase.from('events').update({ status: 'rejected' }).eq('id', id);
    revalidatePath('/');
    revalidatePath('/admin');
}

export async function updateEvent(id: string, updates: any) {
    await supabase.from('events').update(updates).eq('id', id);
    revalidatePath('/');
    revalidatePath('/admin');
}

// --- Creator Studio Actions ---

// --- Creator Studio Actions ---

export async function generateVibeStyle(prompt: string) {
    const { geminiModel } = require('@/lib/gemini');

    // Updated system prompt for Image Generation capabilities
    // Assuming Gemini 2.5 Flash can return image data or we ask it to construct a prompt for itself?
    // Actually, if it's "Nano Banana", let's ask it to DRAW.
    const systemPrompt = `
    You are a Visual Synthesis Engine (Nano Banana).
    The user wants an event flyer background based on: "${prompt}".
    
    Tasks:
    1. Generate a visually stunning background image. 
    2. Return a JSON object with:
       - "backgroundImage": " The base64 data URI of the generated image (if supported) OR a high-quality CSS gradient fallback if image generation fails."
       - "backgroundColor": "A dominant hex color from the design"
       - "fontColor": "A contrasting hex color for text"
       - "fontFamily": "A suitable google font name"
    
    If you cannot generate a real image directly in this response, create a highly detailed, complex CSS radial-gradient or conic-gradient that matches the vibe perfectly.
    `;

    try {
        const result = await geminiModel.generateContent([systemPrompt]);
        const response = await result.response;
        let text = response.text();
        // Clean markdown
        text = text.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
        return JSON.parse(text);
    } catch (e) {
        console.error('Gemini Vibe Design Error:', e);
        // Fallback to a safe "default" vibe
        return {
            backgroundColor: '#000000',
            backgroundImage: 'linear-gradient(45deg, #FF00CC 0%, #333399 100%)',
            fontColor: '#ffffff',
            fontFamily: 'Helvetica'
        };
    }
}

export async function publishEvent(formData: any, flyerBase64: string) {
    // 1. Upload Flyer
    // Convert base64 to buffer
    const buffer = Buffer.from(flyerBase64.replace(/^data:image\/\w+;base64,/, ""), 'base64');
    const fileName = `created-${Date.now()}.jpg`;

    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('event-flyers')
        .upload(fileName, buffer, {
            contentType: 'image/jpeg',
            upsert: true
        });

    if (uploadError) throw new Error('Upload Failed: ' + uploadError.message);

    const publicUrl = supabase.storage.from('event-flyers').getPublicUrl(fileName).data.publicUrl;

    // 2. Create Event Record
    const { data, error } = await supabase.from('events').insert({
        event_name: formData.title,
        event_date: formData.date,
        // venue: formData.venue, // Need to implement venue checking/creation or simpler text field
        // For MVP, simplistic:
        metadata: { venue_text: formData.venue },
        event_vibe: formData.vibe,
        flyer_url: publicUrl,
        status: 'approved' // Auto-approve created events? Or pending? Let's say approved for Creator Studio.
    }).select().single();

    if (error) throw new Error('DB Save Failed: ' + error.message);

    return { success: true, event: data };
}
