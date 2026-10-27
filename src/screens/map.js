import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect } from 'react';
import { daysLeft, dayKey, ensureChapter, newLeft, replayPair } from '../engine/logic.ts';
import { lessons } from '../data/lessons.ts';
import { art } from '../ui/media.ts';
import { useSave } from '../ui/save.tsx';
import { Fox, Tap } from './bits.tsx';
export function MapScreen() {
    const { save, set, setReplay } = useSave();
    useEffect(() => {
        const next = ensureChapter(save, lessons);
        if (next !== save)
            set(next);
    }, [save, set]);
    const chapter = save.chapter && !save.chapter.tested ? save.chapter : null;
    const today = save.today;
    const live = Boolean(today && today.day === dayKey() && today.phase !== 'done');
    const done = Boolean(today && today.day === dayKey() && today.phase === 'done');
    const pair = replayPair(save);
    return (_jsxs("section", { children: [_jsx(Fox, { show: save.fox, mood: "idle" }), _jsx("img", { className: "mark", src: art(save.fox ? 'map.svg' : 'map.svg'), alt: "" }), (save.door === 'phrase' || save.door === 'lapsed') && (_jsx("p", { className: "note", children: "Casual speech is not scored." })), chapter ? (_jsxs(_Fragment, { children: [_jsx("h2", { children: chapter.title }), _jsxs("p", { className: "pack", children: [chapter.title, ", ", newLeft(save), " new left"] }), _jsxs("p", { children: ["about ", daysLeft(save), " days left"] }), _jsxs("p", { children: ["Opened ", chapter.opened] })] })) : (_jsx("h2", { children: "The open chapter will appear here." })), live && _jsx(Tap, { onClick: () => set({ ...save, screen: 'lesson' }), children: "Resume" }), !live && !done && chapter && _jsx(Tap, { onClick: () => set({ ...save, screen: 'minutes' }), children: "Start this sitting" }), done && _jsx("p", { children: "Done for today. Skipped days do not stack." }), save.readingOk === false && (_jsx(Tap, { onClick: () => set({ ...save, readingOk: null, screen: 'probe' }), children: "Try the reading check again" })), pair.length >= 2 && (_jsx("button", { type: "button", className: "quiet", onClick: () => setReplay(pair), children: "See those two again" })), _jsx("h3", { children: "Closed" }), save.closed.length === 0 ? (_jsx("p", { className: "hint", children: "Passed chapters stay here and do not open." })) : (_jsx("ul", { className: "closed", children: save.closed.map((item, index) => (_jsx("li", { children: item.title }, `${item.title}-${index}`))) })), _jsxs("div", { className: "stack", children: [_jsx(Tap, { onClick: () => set({ ...save, screen: 'shelf' }), children: "Reading shelf" }), _jsx(Tap, { onClick: () => set({ ...save, screen: 'pack' }), children: "Pack reader" }), _jsx(Tap, { onClick: () => set({ ...save, screen: 'journal' }), children: "Journal" }), _jsx(Tap, { onClick: () => set({ ...save, screen: 'ime' }), children: "IME guide" }), _jsx(Tap, { onClick: () => set({ ...save, screen: 'about' }), children: "About" })] })] }));
}
