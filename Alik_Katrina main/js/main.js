const music = document.querySelector("#wedding-music");

async function startMusic() {
	try {
		await music.play();

		// Музыка запущена — дополнительные обработчики не нужны.
		document.removeEventListener("click", startMusic);
		document.removeEventListener("keydown", startMusic);
	} catch (error) {
		console.error("Ошибка воспроизведения:", error.name, error.message);
	}
}

document.addEventListener("click", startMusic);
document.addEventListener("keydown", startMusic);

startMusic();
