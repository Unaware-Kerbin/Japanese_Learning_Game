import { createContext, useContext } from 'react';
export const SaveContext = createContext(null);
export function useSave() {
    const ctx = useContext(SaveContext);
    if (!ctx)
        throw new Error('Michi Dojo save is missing');
    return ctx;
}
