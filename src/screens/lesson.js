import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { Lottie } from 'lottie-react';
import { acceptExtra, checkAnswer, commitAnswer, declineExtra, replayPair, showFurigana, trapFor, } from '../engine/logic.ts';
import { lessons } from '../data/lessons.ts';
import { art, playSound, speak, useJapaneseVoice } from '../ui/media.ts';
import { useSave } from '../ui/save.tsx';
import { Fox, Pitch, Tap } from './bits.tsx';
import { ImeBody } from './pages.tsx';
const ROLE = {
    review: 'Review',
    new: 'New',
    extra: 'Extra row',
    test: "Today's check",
    chapter: 'Chapter check',
};
const VOWEL_GRID = [
    { k: 'あ', label: 'ah', en: 'father' },
    { k: 'い', label: 'ee', en: 'see' },
    { k: 'う', label: 'uu', en: 'food, with the y left off' },
    { k: 'え', label: 'eh', en: 'bed' },
    { k: 'お', label: 'oh', en: 'pure oh, with no w' },
];
export function Lesson() {
    const { save } = useSave();
    const today = save.today;
    if (!today || today.phase === 'done')
        return null;
    if (today.phase === 'offer')
        return _jsx(Offer, {});
    const step = today.steps[today.index];
    if (!step)
        return _jsx("p", { children: "This sitting is caught up." });
    const lesson = lessons.find((item) => item.id === step.id);
    if (!lesson)
        return _jsx("p", { children: "That card is missing." });
    return _jsx(Card, { lesson: lesson, role: step.role }, `${today.index}-${step.role}-${lesson.id}`);
}
function Offer() {
    const { save, set } = useSave();
    return (_jsxs("section", { children: [_jsx("h2", { children: "One more row?" }), _jsx("p", { children: "The last new row was solid, and the clock still has room. A 10-minute day never asks." }), _jsxs("div", { className: "stack", children: [_jsx(Tap, { onClick: () => set(acceptExtra(save)), children: "One more row" }), _jsx(Tap, { className: "ghost", onClick: () => set(declineExtra(save, lessons, new Date())), children: "Not now" })] })] }));
}
function Card({ lesson, role }) {
    const { save, set, setReplay } = useSave();
    const voice = useJapaneseVoice();
    const [pending, setPending] = useState(null);
    const [aside, setAside] = useState('');
    const [mood, setMood] = useState('idle');
    const quiet = save.door === 'lot' || !save.fox;
    const furigana = lesson.furigana && showFurigana(save, lesson.id);
    function hear(rate, chain = false) {
        if (!lesson.say || voice !== true)
            return;
        if (quiet && rate > 0.85)
            return;
        const line = lesson.say;
        setMood('listen');
        const spoken = speak(line, rate, () => {
            if (chain)
                speak(line, 1, () => setMood('idle'));
            else
                setMood('idle');
        });
        if (!spoken)
            setMood('idle');
    }
    function grade(value) {
        const verdict = checkAnswer(lesson, value);
        const ok = verdict === 'pass';
        playSound(ok ? 'correct' : 'retry');
        setPending({ ok, verdict, picked: value });
        setMood(ok ? 'yes' : 'again');
        if (!ok && lesson.band === 'vowel' && voice && lesson.say) {
            speak(`${value}。${lesson.answer}`, 0.8);
        }
    }
    function next() {
        const ok = pending ? pending.ok : true;
        set(commitAnswer(save, lesson, ok, lessons, new Date()));
    }
    const pair = replayPair({ ...save, recentMiss: [...save.recentMiss, lesson.id].slice(-8) });
    return (_jsxs("article", { className: "card", "data-lesson": lesson.id, "data-role": role, children: [_jsx("p", { className: "banner", children: ROLE[role] }), _jsx(Fox, { show: save.fox, mood: voice === false ? 'idle' : mood }), lesson.picture && (_jsx("img", { className: "picture", src: art(lesson.picture), alt: lesson.caption ?? '' })), _jsx(Prompt, { lesson: lesson }), lesson.hint && lesson.id !== 'vowel-five' && _jsxs("p", { className: "hint", children: ["(", lesson.hint, ")"] }), furigana && (_jsx("p", { className: "hint", lang: "ja", children: lesson.furigana })), lesson.detail && lesson.id !== 'particle-map' && _jsx("p", { className: "detail", children: lesson.detail }), voice === false && lesson.say && (_jsx("p", { className: "calm", children: "This device cannot speak Japanese yet." })), aside && _jsx("p", { className: "note", children: aside }), lesson.activity === 'teach' && _jsx(Teach, { lesson: lesson, voice: voice === true, onHear: () => hear(0.7, true) }), lesson.activity === 'choice' && (_jsx(Choices, { lesson: lesson, locked: Boolean(pending), onPick: grade })), lesson.activity === 'order' && _jsx(Order, { lesson: lesson, locked: Boolean(pending), onSubmit: grade }), lesson.activity === 'type' && _jsx(Typer, { lesson: lesson, learned: save.learnedKana, locked: Boolean(pending), onSubmit: grade }), lesson.activity === 'trace' && !pending && _jsx(TracePad, { onPass: () => grade(lesson.answer) }), lesson.activity === 'listen' && (_jsx(Listen, { lesson: lesson, voice: voice === true, locked: Boolean(pending), onHear: () => hear(0.7, true), onPick: grade })), !quiet && lesson.say && (_jsxs("div", { className: "row", children: [_jsx("button", { type: "button", className: "quiet", onClick: () => hear(1), children: "Hear it" }), _jsx("button", { type: "button", className: "quiet", onClick: () => {
                            window.speechSynthesis?.cancel();
                            setMood('idle');
                            setAside('Speaking stays optional. This does not finish the card.');
                        }, children: "Continue without speaking" }), _jsx(SpeakTry, { onText: (text) => setAside(text) })] })), quiet && voice === true && lesson.say && (_jsx("button", { type: "button", className: "quiet", onClick: () => hear(0.7), children: "Hear it slowly" })), pending && (_jsxs("div", { className: pending.ok ? 'okbox' : 'trap', role: "status", children: [pending.ok ? (_jsx("p", { children: "Good. The road goes on." })) : (_jsxs(_Fragment, { children: [_jsx("p", { children: "That miss is acknowledged." }), _jsx("p", { children: trapFor(lesson, pending.verdict) }), lesson.band === 'vowel' && (_jsxs("p", { className: "pair", lang: "ja", children: [_jsx("span", { children: pending.picked }), _jsx("span", { children: lesson.answer })] })), _jsx("p", { children: role === 'test' || role === 'chapter'
                                    ? 'It returns to the learning set. The day still counts, and the next chapter still opens.'
                                    : lesson.ungraded
                                        ? 'This early card is not scored.'
                                        : 'It stays in the learning set until one correct answer. The road continues.' }), pair.length >= 2 && (_jsx("button", { type: "button", className: "quiet", onClick: () => setReplay(pair), children: "See those two again" }))] })), _jsx(Tap, { onClick: next, children: "Next" })] })), !pending && lesson.activity === 'teach' && _jsx(Tap, { onClick: next, children: "Continue" })] }));
}
function Prompt({ lesson }) {
    if (lesson.id === 'vowel-five') {
        return (_jsxs("div", { className: "vowel-grid", children: [VOWEL_GRID.map((item) => (_jsxs("div", { children: [_jsx("p", { className: "sound", children: item.label }), _jsx("p", { className: "kana-xl", lang: "ja", children: item.k }), _jsxs("p", { className: "hint", children: ["(", item.en, ")"] })] }, item.k))), _jsx(Pitch, {})] }));
    }
    if (lesson.id === 'particle-map')
        return _jsx(ParticleTable, {});
    if (lesson.band === 'vowel' && lesson.activity === 'teach' && lesson.caption) {
        return (_jsxs(_Fragment, { children: [_jsx("p", { className: "sound", children: lesson.caption }), _jsx("p", { className: "kana-xl", lang: "ja", children: lesson.prompt })] }));
    }
    const jp = /[ぁ-んァ-ン一-龯]/.test(lesson.prompt);
    const huge = jp && [...lesson.prompt].length <= 8;
    return (_jsx("h2", { className: huge ? 'kana-xl' : jp ? 'jp' : 'en', lang: jp ? 'ja' : 'en', children: lesson.prompt }));
}
function ParticleTable() {
    const rows = [
        ['は', 'wa', 'ha'],
        ['を', 'o', 'wo'],
        ['へ', 'e', 'he'],
    ];
    return (_jsxs("div", { children: [_jsx("h2", { className: "en", children: "Written, sound, and keys" }), _jsx("p", { className: "kana-xl", lang: "ja", children: "\u3053\u3093\u306B\u3061\u306F" }), _jsxs("div", { className: "cols", children: [_jsx("strong", { children: "Written" }), _jsx("strong", { children: "Sound" }), _jsx("strong", { children: "Keys" }), rows.map((row) => row.map((cell, index) => (_jsx("span", { lang: index === 0 ? 'ja' : 'en', children: cell }, `${row[0]}-${cell}`))))] }), _jsx("p", { children: "\u308F is a different word (\u304D\u308C\u3044\u3060\u308F). \u3053\u3093\u306B\u3061\u306F uses \u306F, said wa, typed ha. \u3092 is not \u304A. \u3078 is not \u3048." })] }));
}
function Teach({ lesson, voice, onHear }) {
    const chars = [...(lesson.prompt || '')].filter((ch) => /[ぁ-んァ-ンー]/.test(ch));
    if (chars.length < 2 || chars.length > 8) {
        return lesson.say && voice ? (_jsx("button", { type: "button", className: "quiet", onClick: onHear, children: "Hear it slowly, then at normal speed" })) : null;
    }
    return (_jsx("div", { className: "mora", children: chars.map((ch, index) => (_jsx("button", { type: "button", className: "tap key", onClick: () => {
                playSound('mora');
                if (voice)
                    speak(ch, 0.85);
            }, children: ch }, `${ch}-${index}`))) }));
}
function Choices({ lesson, locked, onPick, }) {
    const look = (lesson.choices ?? []).every((choice) => [...choice].length <= 2);
    return (_jsx("div", { className: look ? 'pair' : 'stack', children: (lesson.choices ?? []).map((choice) => (_jsx(Tap, { disabled: locked, onClick: () => onPick(choice), children: choice }, choice))) }));
}
function Order({ lesson, locked, onSubmit, }) {
    const tiles = useMemo(() => shuffleTiles(lesson.id, lesson.tiles ?? []), [lesson.id, lesson.tiles]);
    const [bank, setBank] = useState(tiles);
    const [built, setBuilt] = useState([]);
    return (_jsxs("div", { className: "stack", children: [_jsxs("div", { className: "built", lang: "ja", children: [built.length === 0 && _jsx("span", { className: "hint", children: "Tap the tiles. \u3067\u3059 stays last when it is there." }), built.map((tile, index) => (_jsx("button", { type: "button", className: "tap key", disabled: locked, onClick: () => {
                            setBuilt(built.filter((_, at) => at !== index));
                            setBank([...bank, tile]);
                        }, children: tile }, `${tile}-${index}`)))] }), _jsx("div", { className: "mora", children: bank.map((tile, index) => (_jsx("button", { type: "button", className: "tap key", disabled: locked, onClick: () => {
                        setBank(bank.filter((_, at) => at !== index));
                        setBuilt([...built, tile]);
                    }, children: tile }, `${tile}-${index}`))) }), _jsx(Tap, { disabled: locked || built.length === 0, onClick: () => onSubmit(built.join('')), children: "Check order" })] }));
}
function Typer({ lesson, learned, locked, onSubmit, }) {
    const kana = /^[ぁ-んァ-ンー、。！？\s]+$/.test(lesson.answer);
    const [value, setValue] = useState('');
    const [warn, setWarn] = useState('');
    function submit() {
        if (!value.trim()) {
            setWarn('Write an answer first.');
            return;
        }
        onSubmit(value);
    }
    function press(key) {
        playSound('ink');
        if (key === '⌫')
            setValue((current) => [...current].slice(0, -1).join(''));
        else
            setValue((current) => current + key);
    }
    return (_jsxs("div", { className: kana ? 'stack' : 'ime-row', children: [_jsxs("form", { className: "stack", onSubmit: (event) => {
                    event.preventDefault();
                    if (!locked)
                        submit();
                }, children: [kana ? (_jsx("p", { className: "built", lang: "ja", children: value || '…' })) : (_jsx("textarea", { lang: "ja", rows: 3, value: value, disabled: locked, placeholder: "Write the whole line", onChange: (event) => setValue(event.target.value) })), kana && (_jsxs("div", { className: "keys", children: [learned.map((key) => (_jsx("button", { type: "button", className: "tap key", disabled: locked, onClick: () => press(key), children: key }, key))), _jsx("button", { type: "button", className: "tap key", disabled: locked, onClick: () => press('⌫'), children: "\u232B" })] })), kana && learned.length === 0 && _jsx("p", { className: "note", children: "The keyboard grows as shapes are taught." }), warn && _jsx("p", { className: "note", children: warn }), _jsx(Tap, { disabled: locked, onClick: submit, children: "Check" })] }), !kana && _jsx(ImeBody, { compact: true })] }));
}
function Listen({ lesson, voice, locked, onHear, onPick, }) {
    return (_jsxs("div", { className: "stack", children: [voice && (_jsx("button", { type: "button", className: "quiet", onClick: onHear, children: "Hear it slowly, then choose" })), _jsx(Choices, { lesson: lesson, locked: locked, onPick: onPick })] }));
}
function TracePad({ onPass }) {
    const canvasRef = useRef(null);
    const [ready, setReady] = useState(false);
    const [enough, setEnough] = useState(false);
    const stats = useRef({ points: 0, dist: 0, drawing: false, lastX: 0, lastY: 0 });
    useEffect(() => {
        const timer = window.setTimeout(() => setReady(true), 1800);
        return () => window.clearTimeout(timer);
    }, []);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !ready)
            return;
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.max(1, Math.floor(rect.width * dpr));
        canvas.height = Math.max(1, Math.floor(rect.height * dpr));
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#1c1915';
    }, [ready]);
    function mark(extra, dist) {
        stats.current.points += extra;
        stats.current.dist += dist;
        if (stats.current.points >= 8 || stats.current.dist >= 28)
            setEnough(true);
    }
    function point(event) {
        const rect = event.currentTarget.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }
    return (_jsxs("div", { className: "trace", children: [!ready && (_jsxs(_Fragment, { children: [_jsx("p", { children: "Stroke first." }), _jsx(Lottie, { className: "stroke", src: art('stroke.json'), autoplay: true, loop: false, subscriptions: { complete: () => setReady(true) } })] })), ready && (_jsxs(_Fragment, { children: [_jsx("canvas", { ref: canvasRef, className: "pad", onPointerDown: (event) => {
                            event.currentTarget.setPointerCapture(event.pointerId);
                            playSound('ink');
                            const here = point(event);
                            stats.current.drawing = true;
                            stats.current.lastX = here.x;
                            stats.current.lastY = here.y;
                            const ctx = event.currentTarget.getContext('2d');
                            ctx?.beginPath();
                            ctx?.moveTo(here.x, here.y);
                            mark(4, 0);
                        }, onPointerMove: (event) => {
                            if (!stats.current.drawing)
                                return;
                            const here = point(event);
                            const dist = Math.hypot(here.x - stats.current.lastX, here.y - stats.current.lastY);
                            stats.current.lastX = here.x;
                            stats.current.lastY = here.y;
                            const ctx = event.currentTarget.getContext('2d');
                            ctx?.lineTo(here.x, here.y);
                            ctx?.stroke();
                            mark(1, dist);
                        }, onPointerUp: () => {
                            stats.current.drawing = false;
                        } }), _jsx(Tap, { disabled: !enough, onClick: onPass, children: enough ? 'That trace is enough' : 'Keep tracing' })] }))] }));
}
function SpeakTry({ onText }) {
    const [live, setLive] = useState(false);
    const Ctor = window
        .SpeechRecognition ??
        window.webkitSpeechRecognition;
    if (!Ctor)
        return null;
    return (_jsx("button", { type: "button", className: "quiet", onClick: () => {
            if (live)
                return;
            const recog = new Ctor();
            recog.lang = 'ja-JP';
            recog.onresult = (event) => {
                const text = event.results[0]?.[0]?.transcript ?? '';
                onText(text ? `Heard: ${text}. This does not finish the card.` : 'Nothing landed. This does not finish the card.');
                setLive(false);
            };
            recog.onerror = () => setLive(false);
            setLive(true);
            try {
                recog.start();
            }
            catch {
                setLive(false);
            }
        }, children: "Try speaking" }));
}
function shuffleTiles(id, tiles) {
    const arr = [...tiles];
    let seed = 7;
    for (const ch of id)
        seed = (seed * 33 + ch.charCodeAt(0)) >>> 0;
    for (let i = arr.length - 1; i > 0; i--) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const j = seed % (i + 1);
        const swap = arr[i];
        arr[i] = arr[j];
        arr[j] = swap;
    }
    if (arr.join('') === tiles.join('') && arr.length > 1) {
        const swap = arr[0];
        arr[0] = arr[arr.length - 1];
        arr[arr.length - 1] = swap;
    }
    return arr;
}
export function Replay({ ids, onClose }) {
    const [index, setIndex] = useState(0);
    const [note, setNote] = useState('');
    const [value, setValue] = useState('');
    const lesson = lessons.find((item) => item.id === ids[index]);
    if (!lesson) {
        return (_jsxs("div", { className: "overlay", children: [_jsx("p", { children: "Those two are done. The road was not locked." }), _jsx(Tap, { onClick: onClose, children: "Back" })] }));
    }
    return (_jsxs("div", { className: "overlay", children: [_jsx("p", { className: "banner", children: "See those two again" }), _jsx("p", { children: "This replay does not lock the road." }), _jsx("h2", { className: "jp", lang: "ja", children: lesson.prompt }), lesson.activity === 'choice' ? (_jsx("div", { className: "stack", children: (lesson.choices ?? []).map((choice) => (_jsx(Tap, { onClick: () => setNote(checkAnswer(lesson, choice) === 'pass' ? 'Yes.' : trapFor(lesson, 'miss')), children: choice }, choice))) })) : (_jsxs("form", { className: "stack", onSubmit: (event) => {
                    event.preventDefault();
                    const verdict = checkAnswer(lesson, value || lesson.answer);
                    setNote(verdict === 'pass' ? 'Yes.' : trapFor(lesson, verdict));
                }, children: [_jsx("textarea", { lang: "ja", rows: 3, value: value, onChange: (event) => setValue(event.target.value) }), _jsx(Tap, { onClick: () => setNote(checkAnswer(lesson, value) === 'pass' ? 'Yes.' : trapFor(lesson, checkAnswer(lesson, value))), children: "Check" })] })), note && _jsx("p", { className: "note", children: note }), _jsx(Tap, { onClick: () => {
                    if (index + 1 >= ids.length)
                        onClose();
                    else {
                        setIndex(index + 1);
                        setNote('');
                        setValue('');
                    }
                }, children: index + 1 >= ids.length ? 'Back to the road' : 'Next' })] }));
}
