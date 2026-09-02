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

(() => {
	const media = window.matchMedia("(prefers-reduced-motion: reduce)");
	if (media.matches || !("IntersectionObserver" in window)) return;
	const nodes = document.querySelectorAll(
		"[data-story-reveal]:not([data-story-ready])",
	);
	const observer = new IntersectionObserver(
		(entries) => {
			entries.forEach(({ target, isIntersecting }) => {
				if (!isIntersecting) return;
				target.classList.add("is-visible");
				observer.unobserve(target);
			});
		},
		{ threshold: 0.08 },
	);
	nodes.forEach((node) => {
		node.dataset.storyReady = "true";
		node.classList.add("story-reveal-pending");
		observer.observe(node);
	});
	media.addEventListener("change", ({ matches }) => {
		if (!matches) return;
		observer.disconnect();
		nodes.forEach((node) => node.classList.add("is-visible"));
	});
})();

(() => {
	"use strict";

	// Время в миллисекундах. Длительность самих переходов задана в timing.css.
	const CARD_TEXT_PAUSE = 320;
	const TEXT_STAGGER = 260;

	function init() {
		const sections = document.querySelectorAll("[data-wedding-timing]");
		if (!sections.length || !("IntersectionObserver" in window)) return;

		const motionPreference = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		);

		sections.forEach((section) => {
			if (section.dataset.timingInitialized) return;
			section.dataset.timingInitialized = "true";

			// При отключённой анимации весь текст остаётся видимым с самого начала.
			if (motionPreference.matches) return;

			const card = section.querySelector("[data-timing-card]");
			const texts = Array.from(section.querySelectorAll("[data-timing-text]"));
			if (!card || !texts.length) return;

			let cardStartedAt = null;
			let cardObserver;
			let textObserver;
			let remaining = texts.length;

			const showCard = () => {
				if (cardStartedAt !== null) return;
				cardStartedAt = performance.now();
				card.classList.add("wt-card-visible");
				cardObserver.unobserve(card);
			};

			const showEverything = () => {
				// Возврат к базовым видимым стилям: в том числе при ошибке API.
				section.classList.remove("wt-motion-ready");
				cardObserver?.disconnect();
				textObserver?.disconnect();
				motionPreference.removeEventListener?.("change", onMotionChange);
			};

			const onMotionChange = (event) => {
				if (event.matches) showEverything();
			};

			try {
				cardObserver = new IntersectionObserver(
					(entries) => {
						try {
							if (entries.some((entry) => entry.isIntersecting)) showCard();
						} catch {
							showEverything();
						}
					},
					{ threshold: 0, rootMargin: "0px 0px -32px 0px" },
				);

				textObserver = new IntersectionObserver(
					(entries) => {
						try {
							const visible = entries
								.filter((entry) => entry.isIntersecting)
								.sort(
									(a, b) => texts.indexOf(a.target) - texts.indexOf(b.target),
								);

							visible.forEach((entry, batchIndex) => {
								const element = entry.target;
								if (element.classList.contains("wt-text-visible")) return;
								showCard();

								// Одновременно видимые надписи проявляются по очереди.
								// Пункты ниже экрана ждут собственной прокрутки, а не общего таймера.
								const pause = Math.max(
									0,
									CARD_TEXT_PAUSE - (performance.now() - cardStartedAt),
								);
								element.style.setProperty(
									"--timing-text-delay",
									`${pause + batchIndex * TEXT_STAGGER}ms`,
								);
								element.classList.add("wt-text-visible");
								textObserver.unobserve(element);
								remaining -= 1;
							});

							if (remaining === 0) {
								textObserver.disconnect();
								cardObserver.disconnect();
								motionPreference.removeEventListener?.(
									"change",
									onMotionChange,
								);
							}
						} catch {
							showEverything();
						}
					},
					{ threshold: 0, rootMargin: "0px 0px -24px 0px" },
				);

				cardObserver.observe(card);
				texts.forEach((element) => textObserver.observe(element));
				section.classList.add("wt-motion-ready");
				motionPreference.addEventListener?.("change", onMotionChange);
			} catch {
				showEverything();
			}
		});
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init, { once: true });
	} else {
		init();
	}
})();


(() => {
	"use strict";

	/**
	 * МЕСТО ДЛЯ БУДУЩЕЙ ОТПРАВКИ.
	 * answer = { full_name: "Фамилия Имя Отчество", attendance: "yes" | "no" }
	 * Сейчас функция ничего не отправляет и не сохраняет.
	 * Позже замените её обращением к своему серверу (пример в README.md).
	 * Возвращайте { ok: true } только после подтверждённой отправки.
	 * Токен Telegram-бота хранится на сервере, не в этом файле.
	 */
	async function sendRsvp(answer) {
		return { ok: false, code: "NOT_CONNECTED" };
	}

	function initForm(section) {
		const form = section.querySelector("[data-rsvp-form]");
		if (!form || form.dataset.rsvpReady) return;

		const nameInput = form.elements.namedItem("full_name");
		const button = form.querySelector('button[type="submit"]');
		const status = form.querySelector("[data-rsvp-status]");
		if (!nameInput || !button || !status) return;

		let busy = false;
		const buttonText = button.textContent;

		const showStatus = (message) => {
			status.textContent = message;
		};

		const clearStatus = () => {
			if (!busy) showStatus("");
			nameInput.setCustomValidity("");
		};

		form.addEventListener("input", clearStatus);
		form.addEventListener("change", clearStatus);

		form.addEventListener("submit", async (event) => {
			event.preventDefault();
			if (busy) return;

			// Пробелы не считаются заполненным ФИО; состав имени не ограничиваем.
			const fullName = nameInput.value.trim().replace(/\s+/g, " ");
			nameInput.setCustomValidity(
				fullName ? "" : "Пожалуйста, укажите ваше ФИО.",
			);
			if (!form.reportValidity()) return;

			const selected = form.querySelector('input[name="attendance"]:checked');
			if (!selected || !["yes", "no"].includes(selected.value)) return;

			const answer = { full_name: fullName, attendance: selected.value };
			const controls = Array.from(form.querySelectorAll("input, button"));
			const previousDisabled = controls.map((control) => control.disabled);

			busy = true;
			form.setAttribute("aria-busy", "true");
			controls.forEach((control) => {
				control.disabled = true;
			});
			button.textContent = "Отправляем…";
			showStatus("");

			try {
				const result = await sendRsvp(answer);

				if (result?.ok === true) {
					showStatus("Спасибо! Ваш ответ отправлен.");
				} else if (result?.code === "NOT_CONNECTED") {
					showStatus(
						"Отправка через форму пока недоступна. Пожалуйста, сообщите нам о присутствии лично.",
					);
				} else {
					throw new Error("RSVP_SEND_FAILED");
				}
			} catch {
				showStatus(
					"Не удалось отправить ответ. Попробуйте ещё раз или сообщите нам лично.",
				);
			} finally {
				busy = false;
				form.removeAttribute("aria-busy");
				controls.forEach((control, index) => {
					control.disabled = previousDisabled[index];
				});
				button.textContent = buttonText;
			}
		});

		// Обработчик уже подключён: кнопку можно безопасно включить.
		form.dataset.rsvpReady = "true";
		button.disabled = false;
	}

	function initReveal(section) {
		if (section.dataset.rsvpMotionReady) return;
		section.dataset.rsvpMotionReady = "true";
		if (!("IntersectionObserver" in window)) return;

		const nodes = Array.from(section.querySelectorAll("[data-rsvp-reveal]"));
		const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
		if (!nodes.length || motion?.matches) return;

		let observer;
		const pending = new Set(nodes);

		const cleanup = () => {
			observer?.disconnect();
			section.removeEventListener("focusin", onFocus);
			motion?.removeEventListener?.("change", onMotionChange);
		};

		const show = (node, delay = 0) => {
			if (!pending.has(node)) return;
			node.style.setProperty("--rsvp-reveal-delay", `${delay}ms`);
			node.classList.add("wr-is-visible");
			observer.unobserve(node);
			pending.delete(node);
			if (!pending.size) cleanup();
		};

		const showEverything = () => {
			section.classList.remove("wr-motion-ready");
			cleanup();
		};

		function onFocus(event) {
			const node = event.target.closest("[data-rsvp-reveal]");
			if (node && section.contains(node)) show(node);
		}

		function onMotionChange(event) {
			if (event.matches) showEverything();
		}

		try {
			observer = new IntersectionObserver(
				(entries) => {
					try {
						entries
							.filter((entry) => entry.isIntersecting)
							.sort((a, b) => nodes.indexOf(a.target) - nodes.indexOf(b.target))
							.forEach((entry, index) => show(entry.target, index * 120));
					} catch {
						showEverything();
					}
				},
				{ threshold: 0, rootMargin: "0px 0px -24px 0px" },
			);

			nodes.forEach((node) => observer.observe(node));
			section.addEventListener("focusin", onFocus);
			motion?.addEventListener?.("change", onMotionChange);
			section.classList.add("wr-motion-ready");
		} catch {
			showEverything();
		}
	}

	function init() {
		document.querySelectorAll("[data-wedding-rsvp]").forEach((section) => {
			initForm(section);
			initReveal(section);
		});
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init, { once: true });
	} else {
		init();
	}
})();
