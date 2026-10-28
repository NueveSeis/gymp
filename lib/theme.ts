// Tema claro / oscuro / sistema. La preferencia vive en localStorage y se
// aplica como data-theme en <html>. THEME_SCRIPT corre antes de pintar la
// página (en el <head>) para que no haya parpadeo.

export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_KEY = 'gymp-theme'

export const THEME_SCRIPT = `(function(){try{var p=localStorage.getItem('${THEME_KEY}')||'system';var t=p==='system'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):p;document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='dark'}})()`
