// Polyfill para expor o `Image` do React Native em `global.Image` / `window.Image`.
// Algumas bibliotecas assumem que existe um construtor global `Image` (como em browsers)
// e o utilizam para acessar `Image.resolveAssetSource` em ambiente React Native.

import { Image as RNImage } from "react-native";

(() => {
	const g: any = (globalThis as any) || (global as any);

	// Se ainda não existir um `Image` global, aponta para o `Image` do React Native
	if (typeof g.Image === "undefined") {
		g.Image = RNImage;
	}

	// Garante também o alias em `window` para libs que esperam ambiente web
	if (typeof g.window === "undefined") {
		g.window = g;
	}

	if (typeof g.window.Image === "undefined") {
		g.window.Image = g.Image;
	}
})();
