import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState } from 'react';
import { fresh, journalNote, showFurigana } from '../engine/logic.ts';
import { lessons } from '../data/lessons.ts';
import { useSave } from '../ui/save.tsx';
import { Tap } from './bits.tsx';
function LinkLine({ item }) {
    if (!item.on)
        return _jsxs("p", { className: "off", children: [item.label, " \u2014 off"] });
    return (_jsx("p", { children: _jsx("a", { href: item.href, target: "_blank", rel: "noreferrer", children: item.label }) }));
}
export function Shelf() {
    const { save, set } = useSave();
    const [topic, setTopic] = useState('');
    const [place, setPlace] = useState('');
    const [ending, setEnding] = useState('');
    const [saved, setSaved] = useState(false);
    const tale = [{ href: 'https://hukumusume.com/douwa/', label: 'Tale shelf', on: save.shelf.tale }];
    const easy = [{ href: 'https://www3.nhk.or.jp/news/easy/', label: 'NHK Easy', on: save.shelf.easy }];
    const dict = [
        { href: 'https://www.weblio.jp/', label: 'Weblio', on: save.shelf.easy },
        { href: 'https://eow.alc.co.jp/', label: 'ALC', on: save.shelf.easy },
        { href: 'https://dictionary.goo.ne.jp/', label: 'goo', on: save.shelf.easy },
    ];
    const town = [
        { href: 'https://cookpad.com/', label: 'Cookpad', on: save.shelf.town },
        { href: 'https://tabelog.com/', label: 'Tabelog', on: save.shelf.town },
        { href: 'https://www.hyperdia.com/', label: 'Hyperdia', on: save.shelf.town },
    ];
    const news = [
        { href: 'https://www.newsweekjapan.jp/', label: 'Newsweek Japan', on: save.shelf.news },
        { href: 'https://gigazine.net/', label: 'Gigazine', on: save.shelf.news },
        { href: 'https://rocketnews24.com/', label: 'Rocket News', on: save.shelf.news },
        { href: 'https://www.1101.com/', label: 'Almost Daily Itoi', on: save.shelf.news },
    ];
    const casual = [
        { href: 'https://hamusoku.com/', label: 'Hamusoku', on: save.shelf.casual },
        { href: 'https://blog.livedoor.com/', label: 'livedoor blog', on: save.shelf.casual },
        { href: 'https://www.nicovideo.jp/', label: 'NicoNico', on: save.shelf.casual },
        { href: 'https://www.pixiv.net/', label: 'pixiv', on: save.shelf.casual },
        { href: 'https://www.comico.jp/', label: 'Comico', on: save.shelf.casual },
    ];
    return (_jsxs("section", { children: [_jsx("h2", { children: "Reading shelf" }), _jsx("p", { className: "lead", children: "Links only. This app does not store or show those pages. Easy news uses \u3067\u3059. The news pack in the lessons uses \u3067\u3042\u308B. They stay separate." }), _jsx("h3", { children: "After the student sentence" }), tale.map((item) => (_jsx(LinkLine, { item: item }, item.label))), _jsx("h3", { children: "After the first kanji" }), easy.map((item) => (_jsx(LinkLine, { item: item }, item.label))), dict.map((item) => (_jsx(LinkLine, { item: item }, item.label))), _jsx("h3", { children: "After five kanji" }), town.map((item) => (_jsx(LinkLine, { item: item }, item.label))), _jsx("h3", { children: "After the news card" }), news.map((item) => (_jsx(LinkLine, { item: item }, item.label))), _jsx("h3", { children: "Casual shelf" }), _jsx("p", { className: "note", children: "Casual internet Japanese is not the answer key. Nothing here is scored." }), casual.map((item) => (_jsx(LinkLine, { item: item }, item.label))), _jsx("h3", { children: "This week\u2019s outside page" }), _jsx("p", { children: "Open one unlocked link yourself. The app does not download the page. Then answer three questions." }), _jsxs("label", { children: ["What was the topic?", _jsx("textarea", { value: topic, onChange: (event) => setTopic(event.target.value), rows: 2 })] }), _jsxs("label", { children: ["What time or place did it mention?", _jsx("textarea", { value: place, onChange: (event) => setPlace(event.target.value), rows: 2 })] }), _jsxs("label", { children: ["How did the sentence end?", _jsx("textarea", { value: ending, onChange: (event) => setEnding(event.target.value), rows: 2 })] }), _jsx(Tap, { onClick: () => {
                    const text = `Outside read. Topic: ${topic} Time or place: ${place} Ending: ${ending}`;
                    set({
                        ...save,
                        journal: [
                            ...save.journal,
                            { text, note: 'Outside read. The app did not download the page. These three answers are not scored.' },
                        ],
                    });
                    setSaved(true);
                }, children: "Save the three answers" }), saved && _jsx("p", { className: "note", children: "Saved in the journal. Not scored." })] }));
}
export function Journal() {
    const { save, set } = useSave();
    const [text, setText] = useState('');
    const [note, setNote] = useState('');
    return (_jsxs("section", { children: [_jsx("h2", { children: "Journal" }), (save.door === 'phrase' || save.door === 'lapsed') && _jsx("p", { className: "note", children: "Casual speech is not scored." }), _jsx("p", { className: "lead", children: "A grammatical line in a different pattern stays here. It is not marked wrong." }), _jsx("textarea", { lang: "ja", rows: 5, value: text, placeholder: "One line you could actually use", onChange: (event) => setText(event.target.value) }), _jsx(Tap, { onClick: () => {
                    const next = journalNote(text);
                    setNote(next);
                    if (!text.trim())
                        return;
                    set({ ...save, journal: [...save.journal, { text: text.trim(), note: next }] });
                    setText('');
                }, children: "Keep this line" }), note && _jsx("p", { className: "note", children: note }), _jsx("ul", { children: save.journal.map((entry, index) => (_jsxs("li", { children: [_jsx("p", { lang: "ja", children: entry.text }), _jsx("p", { className: "hint", children: entry.note })] }, `${entry.text}-${index}`))) })] }));
}
const IME = [
    { name: 'Linux', text: 'IBus and Mozc. Add Japanese (Mozc) in the keyboard settings. Type romaji, Space to convert, Enter to accept.' },
    { name: 'Windows', text: 'Microsoft IME. Windows+Space switches languages. Type romaji, Space to convert, Enter to accept.' },
    { name: 'macOS', text: 'System Settings → Keyboard → Input Sources → Japanese. Use the menu bar to switch. Type romaji, Space, Enter.' },
    { name: 'Android', text: 'Gboard or the system Japanese keyboard. The globe key switches. Type, then tap the suggestion.' },
    { name: 'iOS', text: 'Settings → General → Keyboard → Keyboards → Japanese (Romaji). The globe key switches. Tap the suggestion.' },
];
export function ImeBody({ compact }) {
    const rows = compact ? IME : IME;
    return (_jsxs("aside", { className: compact ? 'ime compact' : 'ime', children: [_jsx("h3", { children: "IME" }), rows.map((row) => (_jsxs("p", { children: [_jsxs("strong", { children: [row.name, ". "] }), compact ? row.text.split('.')[0] : row.text] }, row.name)))] }));
}
export function ImePage() {
    return (_jsxs("section", { children: [_jsx("h2", { children: "How to type Japanese" }), _jsx(ImeBody, {})] }));
}
export function About() {
    const { set, setKept, setReplay } = useSave();
    const [arm, setArm] = useState(false);
    return (_jsxs("section", { children: [_jsx("h2", { children: "About Michi Dojo" }), _jsx("p", { children: "Levels on these cards are community estimates, not a JLPT exam pass. Finishing a band here is not an exam result. Steady 15\u201320 minutes a day is about 3.5 years to this app\u2019s N1 list." }), _jsx("p", { children: "Michi Dojo ships a kanji study list derived from OpenJLPT." }), _jsx("p", { children: "OpenJLPT is a derived work under CC BY-SA 4.0. ShareAlike applies to the redistributed dataset in src/data/third_party/mountain.json." }), _jsxs("ul", { children: [_jsxs("li", { children: [_jsx("a", { href: "https://github.com/evanclan/OpenJLPT", target: "_blank", rel: "noreferrer", children: "OpenJLPT" }), ", CC BY-SA 4.0"] }), _jsx("li", { children: _jsx("a", { href: "https://www.edrdg.org/edrdg/licence.html", target: "_blank", rel: "noreferrer", children: "JMdict and KANJIDIC2" }) }), _jsxs("li", { children: [_jsx("a", { href: "https://www.tanos.co.uk/", target: "_blank", rel: "noreferrer", children: "Jonathan Waller, JLPT vocabulary and kanji lists" }), ", CC BY"] }), _jsxs("li", { children: [_jsx("a", { href: "https://tatoeba.org/", target: "_blank", rel: "noreferrer", children: "Tatoeba example sentences" }), ", CC BY 2.0 FR"] })] }), _jsx("p", { children: "The JLPT band names on these cards are community estimates. They are not the official lists published after 2010, and finishing a band in this app is not a JLPT exam result." }), _jsxs("p", { children: ["Lesson prose in this app is original. The linked video is a pointer, not a copy of the narration.", ' ', _jsx("a", { href: "https://www.youtube.com/watch?v=J6Qotze564E", target: "_blank", rel: "noreferrer", children: "Hime\u2019s beginner video" }), ". Reading-shelf links open other sites. This app does not store their articles."] }), _jsx(Tap, { onClick: () => {
                    if (!arm) {
                        setArm(true);
                        return;
                    }
                    localStorage.removeItem('michi.v1');
                    setKept(null);
                    setReplay(null);
                    set(fresh());
                }, children: arm ? 'Clear michi.v1' : 'Start over' })] }));
}
export function Pack() {
    const { save } = useSave();
    const ids = save.chapter?.ids ?? [];
    const rows = ids
        .map((id) => lessons.find((lesson) => lesson.id === id))
        .filter((lesson) => Boolean(lesson))
        .slice(0, 8);
    return (_jsxs("section", { children: [_jsx("h2", { children: "Pack reader" }), _jsx("p", { className: "lead", children: "Up to eight lines from the open chapter. Three of them are clozes when the word is blanked. Example lines in the kanji packs come from the OpenJLPT list. See About. This page does not open an outside article." }), rows.length === 0 && _jsx("p", { children: "Start a chapter and this page fills from it." }), _jsx("ol", { children: rows.map((lesson, index) => (_jsxs("li", { children: [_jsx("p", { lang: "ja", children: lesson.prompt }), showFurigana(save, lesson.id) && lesson.furigana && (_jsx("p", { className: "hint", lang: "ja", children: lesson.furigana })), index < 3 && _jsx("p", { className: "hint", children: "Cloze. The checked line is on the lesson card." })] }, lesson.id))) })] }));
}
