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
