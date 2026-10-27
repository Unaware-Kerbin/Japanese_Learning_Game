import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { beginDay, fresh } from '../engine/logic.ts';
import { lessons } from '../data/lessons.ts';
import { art, useJapaneseVoice } from '../ui/media.ts';
import { useSave } from '../ui/save.tsx';
import { Fox, Tap } from './bits.tsx';
export function Doors() {
    const { save, set } = useSave();
    const voice = useJapaneseVoice();
    function choose(door) {
        const next = {
            ...fresh(),
            door,
            fox: door !== 'lot',
            screen: door === 'lapsed' ? 'check' : 'map',
        };
        set(next);
    }
    return (_jsxs("section", { children: [_jsx(Fox, { show: true, mood: "idle" }), _jsx("img", { className: "mark", src: art('fox.svg'), alt: "" }), _jsx("h2", { children: "Where are you?" }), _jsx("p", { className: "lead", children: "English first. Pick the door that matches what you can already do." }), voice === false && _jsx("p", { className: "calm", children: "This device cannot speak Japanese yet." }), _jsxs("div", { className: "stack", children: [_jsx(Tap, { onClick: () => choose('new'), children: "New" }), _jsx(Tap, { onClick: () => choose('phrase'), children: "I can say it, I can\u2019t read it" }), _jsx(Tap, { onClick: () => choose('katakana'), children: "Katakana first" }), _jsx(Tap, { onClick: () => choose('lapsed'), children: "I studied before" }), _jsx(Tap, { onClick: () => choose('read'), children: "I can read" }), _jsx(Tap, { onClick: () => choose('lot'), children: "I read a lot" }), _jsx("button", { type: "button", className: "quiet", onClick: () => set({ ...save, screen: 'about' }), children: "About" })] })] }));
}
const PROBE = [
    { kana: 'ねこ', en: 'cat' },
    { kana: 'みず', en: 'water' },
    { kana: 'すし', en: 'sushi' },
    { kana: 'やま', en: 'mountain' },
    { kana: 'ひと', en: 'person' },
];
export function Probe() {
    const { save, set } = useSave();
    const [index, setIndex] = useState(0);
    const [hits, setHits] = useState(0);
    const [picked, setPicked] = useState(null);
    const done = index >= PROBE.length;
    const word = PROBE[Math.min(index, PROBE.length - 1)];
    function finish(ok) {
        const next = { ...save, readingOk: ok };
        if (!ok) {
            set({ ...next, screen: 'map' });
            return;
        }
        if (next.door === 'read' || next.door === 'lot') {
            set({ ...next, screen: 'band' });
            return;
        }
        set({ ...next, screen: 'minutes' });
    }
    return (_jsxs("section", { children: [_jsx("h2", { children: "Five words" }), _jsx("p", { className: "lead", children: "Read the hiragana. Four of five opens the advanced road. A katakana miss cannot open it." }), done ? (_jsxs("div", { className: "stack", children: [_jsx("p", { children: hits >= 4
                            ? `${hits} of 5. The advanced road can open.`
                            : `${hits} of 5. て-form, adjective grammar, and kanji stay locked.` }), _jsx(Tap, { onClick: () => finish(hits >= 4), children: hits >= 4 ? 'Continue' : 'Stay on the early road' })] })) : (_jsxs("div", { className: "stack", children: [_jsx("p", { className: "kana-xl", lang: "ja", children: word.kana }), PROBE.map((item) => (_jsx(Tap, { disabled: picked !== null, onClick: () => {
                            setPicked(item.en);
                            if (item.en === word.en)
                                setHits((n) => n + 1);
                        }, children: item.en }, item.en))), picked && (_jsx(Tap, { onClick: () => {
                            setPicked(null);
                            setIndex((n) => n + 1);
                        }, children: "Next word" }))] }))] }));
}
const BANDS = [
    { id: 'N5', text: 'N5 — sentences, です/ます, て-form, then kanji' },
    { id: 'N4', text: 'N4 — from this band upward' },
    { id: 'N3', text: 'N3 — the news line, then kanji' },
    { id: 'N1', text: 'N1 — 読みます first, then the rest of the list' },
    { id: 'N2', text: 'N2 — packs you have not already passed' },
];
export function Band() {
    const { save, set } = useSave();
    const ordered = ['N5', 'N4', 'N3', 'N2', 'N1'];
    return (_jsxs("section", { children: [_jsx("h2", { children: "Where should the list start?" }), _jsx("p", { className: "lead", children: "The road continues upward from the band you pick. Bands below it stay closed." }), _jsx("div", { className: "stack", children: ordered.map((id) => {
                    const band = BANDS.find((item) => item.id === id);
                    if (!band)
                        return null;
                    return (_jsx(Tap, { onClick: () => set({ ...save, level: band.id, screen: 'minutes' }), children: band.text }, band.id));
                }) })] }));
}
export function Minutes() {
    const { save, set } = useSave();
    const choices = [10, 15, 20];
    return (_jsxs("section", { children: [_jsx("h2", { children: "How long is this sitting?" }), _jsx("p", { className: "lead", children: "Reviews and new cards share the time. Today\u2019s check sits inside it, not after a timer. A 10-minute day never offers an extra row. Weekends still get new items." }), _jsx("div", { className: "stack", children: choices.map((minutes) => (_jsxs(Tap, { onClick: () => set(beginDay(save, minutes, lessons, new Date())), children: [minutes, " minutes"] }, minutes))) })] }));
}
const CHECK = [
    { id: 'v-a', group: 'vowel', prompt: 'あ', choices: ['ah', 'ee', 'uu', 'eh', 'oh'], answer: 'ah' },
    { id: 'v-i', group: 'vowel', prompt: 'い', choices: ['ah', 'ee', 'uu', 'eh', 'oh'], answer: 'ee' },
    { id: 'v-u', group: 'vowel', prompt: 'う', choices: ['ah', 'ee', 'uu', 'eh', 'oh'], answer: 'uu' },
    { id: 'v-e', group: 'vowel', prompt: 'え', choices: ['ah', 'ee', 'uu', 'eh', 'oh'], answer: 'eh' },
    { id: 'v-o', group: 'vowel', prompt: 'お', choices: ['ah', 'ee', 'uu', 'eh', 'oh'], answer: 'oh' },
    { id: 'w-neko', group: 'word', prompt: 'ねこ', choices: ['cat', 'water', 'sushi'], answer: 'cat' },
    { id: 'w-mizu', group: 'word', prompt: 'みず', choices: ['cat', 'water', 'sushi'], answer: 'water' },
    { id: 'w-sushi', group: 'word', prompt: 'すし', choices: ['cat', 'water', 'sushi'], answer: 'sushi' },
    { id: 'daku', group: 'daku', prompt: 'が', choices: ['ka', 'ga'], answer: 'ga' },
    { id: 'p-wa', group: 'particle', prompt: 'は is said…', choices: ['wa', 'ha'], answer: 'wa' },
    { id: 'p-ga', group: 'particle', prompt: 'が marks the…', choices: ['topic', 'subject'], answer: 'subject' },
    { id: 'p-wo', group: 'particle', prompt: 'を is said…', choices: ['o', 'wo'], answer: 'o' },
    { id: 'p-ni', group: 'particle', prompt: 'に often marks…', choices: ['destination', 'place of action'], answer: 'destination' },
    { id: 'p-de', group: 'particle', prompt: 'で often marks…', choices: ['destination', 'place of action'], answer: 'place of action' },
    { id: 'p-no', group: 'particle', prompt: 'の links…', choices: ['two nouns', 'a question'], answer: 'two nouns' },
    { id: 'p-he', group: 'particle', prompt: 'へ is said…', choices: ['e', 'he'], answer: 'e' },
];
export function Check() {
    const { save, set, setKept } = useSave();
    const [index, setIndex] = useState(0);
    const [right, setRight] = useState([]);
    const item = CHECK[index];
    const done = index >= CHECK.length;
    function finish() {
        const kept = CHECK.filter((entry) => right.includes(entry.id)).map((entry) => entry.prompt);
        const rebuild = CHECK.filter((entry) => !right.includes(entry.id)).map((entry) => entry.prompt);
        const vowelsPassed = CHECK.filter((entry) => entry.group === 'vowel').every((entry) => right.includes(entry.id));
        setKept({ kept, rebuild });
        set({ ...save, skippedVowels: vowelsPassed, screen: 'kept' });
    }
    if (done) {
        return (_jsxs("section", { children: [_jsx("h2", { children: "Check finished" }), _jsx("p", { children: "Nothing here was graded. Next is a kind summary." }), _jsx(Tap, { onClick: finish, children: "See what you kept" })] }));
    }
    return (_jsxs("section", { children: [_jsx("h2", { children: "What is still there?" }), _jsx("p", { className: "lead", children: "Ungraded. Vowels, pictured words, dakuten, and \u306F \u304C \u3092 \u306B \u3067 \u306E \u3078. Casual speech is not scored." }), _jsx("p", { className: "kana-xl", lang: "ja", children: item.prompt }), _jsx("div", { className: "stack", children: item.choices.map((choice) => (_jsx(Tap, { onClick: () => {
                        if (choice === item.answer)
                            setRight((list) => [...list, item.id]);
                        setIndex((n) => n + 1);
                    }, children: choice }, choice))) })] }));
}
export function Kept() {
    const { save, set, kept } = useSave();
    return (_jsxs("section", { children: [_jsx("h2", { children: "What you kept" }), _jsxs("p", { className: "lead", children: ["You kept more than a blank start. The gaps are a rebuild, not a verdict. Casual speech stays unscored.", save.skippedVowels
                        ? ' The vowels you passed will not be taught again.'
                        : ' Missed vowels are named here, and they do not open て-form.'] }), kept && kept.kept.length > 0 && (_jsxs(_Fragment, { children: [_jsx("h3", { children: "Kept" }), _jsx("ul", { children: kept.kept.map((line) => (_jsx("li", { children: line }, line))) })] })), kept && kept.rebuild.length > 0 && (_jsxs(_Fragment, { children: [_jsx("h3", { children: "Rebuild" }), _jsx("ul", { children: kept.rebuild.map((line) => (_jsx("li", { children: line }, line))) })] })), !kept && _jsx("p", { children: "What you kept is still yours. A passed vowel row is not opened again." }), _jsx(Tap, { onClick: () => set({ ...save, screen: 'map' }), children: "Continue" })] }));
}
