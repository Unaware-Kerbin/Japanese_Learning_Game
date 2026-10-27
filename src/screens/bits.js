import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Lottie } from 'lottie-react';
import { art, playSound, useJapaneseVoice } from '../ui/media.ts';
export function Tap({ children, onClick, className = '', disabled, }) {
    return (_jsx("button", { type: "button", className: `tap ${className}`, disabled: disabled, onClick: () => {
            playSound('tap');
            onClick?.();
        }, children: children }));
}
export function Top({ title, back }) {
    return (_jsxs("header", { className: "top", children: [back && (_jsx(Tap, { className: "back", onClick: back, children: "Back" })), _jsx("p", { className: "brand", children: title })] }));
}
export function Fox({ show, mood }) {
    const voice = useJapaneseVoice();
    const face = mood === 'listen' && voice === false ? 'idle' : mood;
    if (!show)
        return null;
    return (_jsx("div", { className: "foxbox", children: _jsx(Lottie, { src: art(`fox-${face}.json`), loop: face === 'idle' || face === 'listen', autoplay: true, className: "fox" }) }));
}
export function backHome(save) {
    if (!save.door)
        return { ...save, screen: 'door' };
    return { ...save, screen: 'map' };
}
export function Pitch() {
    return (_jsxs("p", { className: "pitch", children: [_jsx("svg", { viewBox: "0 0 160 40", "aria-hidden": "true", children: _jsx("path", { d: "M8 10 H70 L150 30", fill: "none", stroke: "#1c1915", strokeWidth: "3" }) }), _jsx("span", { children: "visual guide" })] }));
}
