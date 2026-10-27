import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { lessons } from './data/lessons.ts';
import { load, needsProbe, persist } from './engine/logic.ts';
import { About, ImePage, Journal, Pack, Shelf } from './screens/pages.tsx';
import { Lesson, Replay } from './screens/lesson.tsx';
import { MapScreen } from './screens/map.tsx';
import { Band, Check, Doors, Kept, Minutes, Probe } from './screens/flow.tsx';
import { Top, backHome } from './screens/bits.tsx';
import { art } from './ui/media.ts';
import { SaveContext } from './ui/save.tsx';
function viewOf(save) {
    if (['about', 'shelf', 'journal', 'ime', 'pack'].includes(save.screen))
        return save.screen;
    if (!save.door)
        return 'door';
    if (save.screen === 'check' || save.screen === 'kept')
        return save.screen;
    if (save.screen === 'lesson' && save.today && save.today.phase !== 'done')
        return 'lesson';
    if (save.screen === 'minutes')
        return 'minutes';
    if (needsProbe(save, lessons))
        return 'probe';
    if ((save.door === 'read' || save.door === 'lot') && save.readingOk === true && !save.level)
        return 'band';
    return 'map';
}
function frameFor(view) {
    if (view === 'door' || view === 'probe' || view === 'band' || view === 'check' || view === 'kept') {
        return 'frames/Door.svg';
    }
    if (view === 'map' || view === 'shelf' || view === 'about' || view === 'pack')
        return 'frames/Map.svg';
    return 'frames/Lesson.svg';
}
export default function App() {
    const [save, setSave] = useState(() => load());
    const [replay, setReplay] = useState(null);
    const [kept, setKept] = useState(null);
    const set = useCallback((next) => {
        persist(next);
        setSave(next);
    }, []);
    useEffect(() => {
        if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android')
            return;
        let handle;
        let dead = false;
        void import('@capacitor/app')
            .then(({ App: CapApp }) => CapApp.addListener('backButton', () => {
            setSave((current) => {
                const next = backHome(current);
                persist(next);
                return next;
            });
        }))
            .then((listener) => {
            if (dead)
                void listener.remove();
            else
                handle = listener;
        })
            .catch(() => { });
        return () => {
            dead = true;
            void handle?.remove();
        };
    }, []);
    const view = viewOf(save);
    const showBack = !['door', 'map', 'probe', 'band', 'check'].includes(view);
    let body = _jsx(MapScreen, {});
    if (view === 'door')
        body = _jsx(Doors, {});
    else if (view === 'probe')
        body = _jsx(Probe, {});
    else if (view === 'band')
        body = _jsx(Band, {});
    else if (view === 'minutes')
        body = _jsx(Minutes, {});
    else if (view === 'check')
        body = _jsx(Check, {});
    else if (view === 'kept')
        body = _jsx(Kept, {});
    else if (view === 'lesson')
        body = _jsx(Lesson, {});
    else if (view === 'shelf')
        body = _jsx(Shelf, {});
    else if (view === 'journal')
        body = _jsx(Journal, {});
    else if (view === 'ime')
        body = _jsx(ImePage, {});
    else if (view === 'about')
        body = _jsx(About, {});
    else if (view === 'pack')
        body = _jsx(Pack, {});
    return (_jsx(SaveContext.Provider, { value: { save, set, replay, setReplay, kept, setKept }, children: _jsxs("div", { className: "app", "data-screen": view, style: { backgroundImage: `url("${art('paper.webp')}")` }, children: [_jsx("img", { className: "frame", alt: "", src: art(frameFor(view)) }), _jsx(Top, { title: "Michi Dojo", back: showBack ? () => set(backHome(save)) : undefined }), body, replay && _jsx(Replay, { ids: replay, onClose: () => setReplay(null) })] }) }));
}
