import { useEffect, useState } from 'react';
export function art(file) {
    const base = import.meta.env.BASE_URL;
    return `${base}art/${file}`;
}
const clips = new Map();
export function playSound(name) {
    try {
        let clip = clips.get(name);
        if (!clip) {
            clip = new Audio(art(`${name}.wav`));
            clips.set(name, clip);
        }
        clip.currentTime = 0;
        void clip.play().catch(() => { });
    }
    catch {
        /* autoplay can be blocked; the card still moves */
    }
}
export function findJapaneseVoice() {
    if (typeof window === 'undefined' || !window.speechSynthesis)
        return null;
    const voices = window.speechSynthesis.getVoices();
    return voices.find((voice) => /^ja([-_]|$)/i.test(voice.lang)) ?? null;
}
export function speak(text, rate, onend) {
    const voice = findJapaneseVoice();
    if (!voice || !text)
        return false;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = 'ja-JP';
    utterance.rate = rate;
    utterance.onend = () => onend?.();
    utterance.onerror = () => onend?.();
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    return true;
}
export function useJapaneseVoice() {
    const [has, setHas] = useState(null);
    useEffect(() => {
        if (typeof window === 'undefined' || !window.speechSynthesis) {
            setHas(false);
            return;
        }
        const check = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length === 0)
                return false;
            setHas(voices.some((voice) => /^ja([-_]|$)/i.test(voice.lang)));
            return true;
        };
        if (check())
            return;
        const timer = window.setTimeout(() => setHas(false), 500);
        const onChange = () => {
            if (check())
                window.clearTimeout(timer);
        };
        window.speechSynthesis.addEventListener('voiceschanged', onChange);
        return () => {
            window.clearTimeout(timer);
            window.speechSynthesis.removeEventListener('voiceschanged', onChange);
        };
    }, []);
    return has;
}
