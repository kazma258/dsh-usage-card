// dsh-usage-card — browser half.
//
// Renders a non-interactive card in the sidebar FOOT, directly ABOVE the
// settings trigger (registered into the `sidebar.footer.action` list slot,
// which the sidebar shell lays out above the settings area). The card mimics
// the settings button's visual language (12px radius, hover fill, same
// typography and spacing) but is a plain div showing:
//   - 7d / 30d token usage
//   - 7d / 30d spend (official platform figure when DEEPSEEK_PLATFORM_TOKEN is
//     configured, otherwise a local estimate)
//   - remaining balance (DeepSeek /user/balance)
// Data comes from the host route /usage-card/overview; secrets never touch
// this page.
window.__ModuleLoader__.load({
	id: "dsh-usage-card",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");

		// ---- styles (theme tokens only; light/dark aware) ---------------
		const css = ".uc_card{box-sizing:border-box;width:calc(100% + 4px);min-width:0;margin:4px -2px;padding:8px 10px;border-radius:12px;background:transparent;color:var(--dsw-alias-label-primary);font-size:12px;line-height:18px;flex-direction:column;gap:3px;display:flex}.uc_card:hover{background:var(--dsw-alias-interactive-bg-hover)}.uc_head{flex:none;align-items:center;gap:6px;height:18px;display:flex}.uc_title{flex:1;min-width:0;color:var(--dsw-alias-label-primary);font-size:12px;font-weight:600;white-space:nowrap;text-overflow:ellipsis;overflow:hidden}.uc_source{box-sizing:border-box;flex:none;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-interactive-bg-hover);border:none;border-radius:999px;padding:0 6px;font-family:inherit;font-size:12px;font-weight:600;line-height:16px;cursor:pointer}.uc_source:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.uc_tipWrap{flex:none;position:relative;display:inline-flex}.uc_tip{position:fixed;transform:translateY(-100%);z-index:60;box-sizing:border-box;width:260px;padding:7px 9px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-overlay);box-shadow:var(--dsw-shadow-lv2,0 4px 16px rgba(0,0,0,.16));color:var(--dsw-alias-label-primary);font-size:11px;font-weight:400;line-height:16px;white-space:normal;pointer-events:none}.uc_refresh{flex:none;width:18px;height:18px;color:var(--dsw-alias-label-secondary);background:transparent;border:none;border-radius:6px;padding:0;cursor:pointer;justify-content:center;align-items:center;display:inline-flex}.uc_refresh:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.uc_row{flex:none;align-items:baseline;gap:6px;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:16px;white-space:nowrap;font-variant-numeric:tabular-nums;overflow:hidden;display:flex}.uc_rowValue{color:var(--dsw-alias-label-primary);font-weight:600}.uc_rowCost{margin-left:auto;color:var(--dsw-alias-label-secondary)}.uc_divider{flex:none;height:1px;background:var(--dsw-alias-border-l2);margin:2px 0}.uc_balance{flex:none;align-items:baseline;gap:6px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;white-space:nowrap;font-variant-numeric:tabular-nums;overflow:hidden;display:flex}.uc_balanceValue{font-size:15px;font-weight:700;color:var(--dsw-alias-state-success-primary)}.uc_error{flex:none;color:var(--dsw-alias-state-error-primary);font-size:11px;line-height:16px;white-space:nowrap;text-overflow:ellipsis;overflow:hidden}.uc_overlay{z-index:1000;justify-content:center;align-items:center;display:flex;position:fixed;inset:0}.uc_mask{background:var(--dsw-alias-bg-mask-1);backdrop-filter:var(--dsw-mask-blur);position:absolute;inset:0}.uc_panel{z-index:1;box-sizing:border-box;background:var(--dsw-alias-bg-layer-2);width:420px;max-width:calc(100vw - 48px);border-radius:20px;box-shadow:var(--dsw-shadow-lv3);padding:18px 18px 16px;flex-direction:column;gap:10px;display:flex;position:relative}.uc_panelTitle{color:var(--dsw-alias-label-primary);font-size:15px;font-weight:600;line-height:22px}.uc_panelClose{cursor:pointer;position:absolute;top:12px;right:12px;width:24px;height:24px;color:var(--dsw-alias-label-secondary);background:transparent;border:none;border-radius:8px;justify-content:center;align-items:center;display:inline-flex;padding:0}.uc_panelClose:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.uc_desc{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}.uc_code{box-sizing:border-box;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:6px 8px;flex:1;min-width:0;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;line-height:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;user-select:all}.uc_codeRow{flex:none;align-items:center;gap:6px;display:flex}.uc_copy{flex:none;color:var(--dsw-alias-label-secondary);background:transparent;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:3px 10px;font-family:inherit;font-size:11px;line-height:16px;cursor:pointer}.uc_copy:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.uc_input{box-sizing:border-box;width:100%;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:7px 10px;font-family:inherit;font-size:13px;line-height:18px}.uc_input:focus{outline:none;border-color:var(--dsw-alias-state-business-primary)}.uc_actions{justify-content:flex-end;align-items:center;gap:8px;display:flex}.uc_btn{cursor:pointer;border-radius:10px;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-primary);font-family:inherit;font-size:13px;line-height:18px;padding:6px 14px}.uc_btn:hover{background:var(--dsw-alias-interactive-bg-hover)}.uc_btnPrimary{background:var(--dsw-alias-button-elevated-fill);border-color:transparent}.uc_btnPrimary:hover{background:var(--dsw-alias-button-floating-hover)}.uc_btnPrimary:disabled{opacity:.6;cursor:default}.uc_btnDanger{color:var(--dsw-alias-state-error-primary)}.uc_btnDanger:hover{background:var(--dsw-alias-state-error-primary);color:#fff}.uc_modalError{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}.uc_rail{box-sizing:border-box;width:40px;height:40px;margin:4px auto;padding:0;border:none;border-radius:12px;background:transparent;color:var(--dsw-alias-label-primary);cursor:pointer;flex-direction:column;justify-content:center;align-items:center;gap:2px;display:flex;font-family:inherit}.uc_rail:hover{background:var(--dsw-alias-interactive-bg-hover)}.uc_railMark{font-size:11px;font-weight:700;line-height:14px}.uc_railDot{width:6px;height:6px;border-radius:999px;background:var(--dsw-alias-label-secondary)}.uc_railDotOk{background:var(--dsw-alias-state-success-primary)}.uc_railDotErr{background:var(--dsw-alias-state-error-primary)}"
		const tagId = "dsh-usage-card/UsageCard.module.css";
		const styles = {
			card: "uc_card",
			head: "uc_head",
			title: "uc_title",
			source: "uc_source",
			tipWrap: "uc_tipWrap",
			tip: "uc_tip",
			refresh: "uc_refresh",
			row: "uc_row",
			rowValue: "uc_rowValue",
			rowCost: "uc_rowCost",
			divider: "uc_divider",
			balance: "uc_balance",
			balanceValue: "uc_balanceValue",
			error: "uc_error",
			overlay: "uc_overlay",
			mask: "uc_mask",
			panel: "uc_panel",
			panelTitle: "uc_panelTitle",
			panelClose: "uc_panelClose",
			desc: "uc_desc",
			code: "uc_code",
			codeRow: "uc_codeRow",
			copy: "uc_copy",
			input: "uc_input",
			actions: "uc_actions",
			btn: "uc_btn",
			btnPrimary: "uc_btnPrimary",
			btnDanger: "uc_btnDanger",
			modalError: "uc_modalError",
			rail: "uc_rail",
			railMark: "uc_railMark",
			railDot: "uc_railDot",
			railDotOk: "uc_railDotOk",
			railDotErr: "uc_railDotErr"
		};

		// ---- formatting -------------------------------------------------
		const OVERVIEW_PATH = "/usage-card/overview";
		const TOKEN_PATH = "/usage-card/token";
		const POLL_MS = 60 * 1000;

		function currencySymbol(code) {
			switch (code) {
				case "CNY": return "¥";
				case "USD": return "$";
				case "EUR": return "€";
				case "JPY": return "¥";
				case "HKD": return "HK$";
				default: return code ? code + " " : "";
			}
		}

		function formatCost(value, currency) {
			const symbol = currencySymbol(currency);
			if (!Number.isFinite(value) || value <= 0) return symbol + "0";
			if (value >= 100) return symbol + value.toFixed(0);
			if (value >= 1) return symbol + value.toFixed(2);
			if (value >= 0.01) return symbol + value.toFixed(3);
			return symbol + value.toPrecision(2);
		}

		function formatTokens(value) {
			if (!Number.isFinite(value)) return "—";
			if (value >= 1e9) return (value / 1e9).toFixed(2) + "B";
			if (value >= 1e6) return (value / 1e6).toFixed(2) + "M";
			if (value >= 1e3) return (value / 1e3).toFixed(1) + "K";
			return String(Math.round(value));
		}

		// ---- data hook --------------------------------------------------
		// Refresh triggers:
		//   - mount, 60s interval, window focus, manual ⟳ button
		//   - conversation activity: current session's updatedAt changed
		//     (a message was sent) or its running flag flipped true->false
		//     (a response completed) -> debounced refetch.
		function useOverview(sessions) {
			const [state, setState] = react.useState({ status: "loading", data: null, error: null });
			const [tick, setTick] = react.useState(0);
			const reload = react.useCallback(() => {
				setTick((value) => value + 1);
			}, []);
			react.useEffect(() => {
				let alive = true;
				let debounce = null;
				let offSessions = null;
				const schedule = (ms) => {
					if (debounce !== null) window.clearTimeout(debounce);
					debounce = window.setTimeout(() => {
						debounce = null;
						load();
					}, ms);
				};
				const load = async () => {
					try {
						const response = await fetch(OVERVIEW_PATH, { cache: "no-store" });
						let body = null;
						try {
							body = await response.json();
						} catch {}
						if (!alive) return;
						if (!response.ok || body === null || body.ok !== true) {
							throw new Error(body && typeof body.message === "string" ? body.message : "overview unavailable (HTTP " + response.status + ")");
						}
						setState({ status: "ready", data: body, error: null });
					} catch (error) {
						if (!alive) return;
						setState({ status: "error", data: null, error: error instanceof Error ? error.message : String(error) });
					}
				};
				load();
				const timer = window.setInterval(load, POLL_MS);
				const onFocus = () => {
					load();
				};
				window.addEventListener("focus", onFocus);
				// Conversation-triggered refresh through the sessions list store
				// (host/session-status frames drive running + updatedAt).
				if (sessions && sessions.list && typeof sessions.list.subscribe === "function") {
					const seed = sessions.list.getSnapshot();
					const seedSummary = seed.current !== void 0 ? seed.byId[seed.current] : void 0;
					let lastUpdatedAt = seedSummary?.updatedAt ?? 0;
					let wasRunning = seedSummary?.running === true;
					offSessions = sessions.list.subscribe((snapshot) => {
						const summary = snapshot.current !== void 0 ? snapshot.byId[snapshot.current] : void 0;
						const updatedAt = summary?.updatedAt ?? 0;
						const running = summary?.running === true;
						if (updatedAt !== lastUpdatedAt) {
							lastUpdatedAt = updatedAt;
							schedule(3000);
						} else if (wasRunning && !running) {
							schedule(2500);
						}
						wasRunning = running;
					});
				}
				return () => {
					alive = false;
					window.clearInterval(timer);
					window.removeEventListener("focus", onFocus);
					if (debounce !== null) window.clearTimeout(debounce);
					if (offSessions !== null) offSessions();
				};
			}, [tick, sessions]);
			return { state, reload };
		}

		// ---- the card ---------------------------------------------------
				// ---- the token dialog --------------------------------------------
		function TokenDialog({ open, t, onClose }) {
			const [token, setToken] = react.useState("");
			const [saving, setSaving] = react.useState(false);
			const [formError, setFormError] = react.useState(null);
			const [copied, setCopied] = react.useState(false);
			const inputRef = react.useRef(null);
			const copy = async () => {
				try {
					await navigator.clipboard.writeText(t("token.code"));
					setCopied(true);
					window.setTimeout(() => setCopied(false), 1500);
				} catch {}
			};
			react.useEffect(() => {
				if (!open) return;
				setToken("");
				setFormError(null);
				setSaving(false);
				const onKey = (event) => {
					if (event.key === "Escape") onClose();
				};
				document.addEventListener("keydown", onKey);
				const focusTimer = window.setTimeout(() => {
					inputRef.current?.focus();
				}, 50);
				return () => {
					document.removeEventListener("keydown", onKey);
					window.clearTimeout(focusTimer);
				};
			}, [open, onClose]);
			if (!open) return null;
			const save = async () => {
				const value = token.trim();
				if (value.length === 0) {
					setFormError(t("token.errorEmpty"));
					return;
				}
				setSaving(true);
				setFormError(null);
				try {
					const response = await fetch(TOKEN_PATH, {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ token: value })
					});
					let body = null;
					try {
						body = await response.json();
					} catch {}
					if (!response.ok || body === null || body.ok !== true) {
						throw new Error(body && typeof body.message === "string" ? body.message : "HTTP " + response.status);
					}
					onClose(true);
				} catch (error) {
					setFormError(error instanceof Error ? error.message : String(error));
				} finally {
					setSaving(false);
				}
			};
			const clear = async () => {
				setSaving(true);
				setFormError(null);
				try {
					const response = await fetch(TOKEN_PATH, {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ clear: true })
					});
					let body = null;
					try {
						body = await response.json();
					} catch {}
					if (!response.ok || body === null || body.ok !== true) {
						throw new Error(body && typeof body.message === "string" ? body.message : "HTTP " + response.status);
					}
					onClose(true);
				} catch (error) {
					setFormError(error instanceof Error ? error.message : String(error));
				} finally {
					setSaving(false);
				}
			};
			return (0, react_jsx_runtime.jsxs)("div", {
				className: styles.overlay,
				role: "presentation",
				children: [
					(0, react_jsx_runtime.jsx)("div", {
						className: styles.mask,
						"aria-hidden": "true",
						onClick: () => {
							onClose(false);
						}
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						className: styles.panel,
						role: "dialog",
						"aria-modal": "true",
						"aria-label": t("token.title"),
						children: [
							(0, react_jsx_runtime.jsx)("div", { className: styles.panelTitle, children: t("token.title") }),
							(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: styles.panelClose,
								"aria-label": t("token.close"),
								onClick: () => {
									onClose(false);
								},
								children: "✕"
							}),
							(0, react_jsx_runtime.jsx)("div", { className: styles.desc, children: t("token.desc1") }),
							(0, react_jsx_runtime.jsx)("div", { className: styles.desc, children: t("token.desc2") }),
							(0, react_jsx_runtime.jsxs)("div", { className: styles.codeRow, children: [
							(0, react_jsx_runtime.jsx)("div", { className: styles.code, children: t("token.code") }),
							(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: styles.copy,
								"aria-label": t("token.copy"),
								onClick: copy,
								children: copied ? t("token.copied") : t("token.copy")
							})
						]}),
							(0, react_jsx_runtime.jsx)("div", { className: styles.desc, children: t("token.desc3") }),
							(0, react_jsx_runtime.jsx)("input", {
								ref: inputRef,
								className: styles.input,
								type: "password",
								value: token,
								placeholder: t("token.placeholder"),
								autoComplete: "off",
								spellCheck: false,
								onChange: (event) => {
									setToken(event.target.value);
								},
								onKeyDown: (event) => {
									if (event.key === "Enter") save();
								}
							}),
							formError !== null && (0, react_jsx_runtime.jsx)("div", { className: styles.modalError, role: "alert", children: formError }),
							(0, react_jsx_runtime.jsxs)("div", {
								className: styles.actions,
								children: [
									(0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: styles.btn,
										onClick: () => {
											onClose(false);
										},
										children: t("token.cancel")
									}),
									(0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: styles.btn + " " + styles.btnDanger,
										disabled: saving,
										onClick: clear,
										children: t("token.clear")
									}),
									(0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: styles.btn + " " + styles.btnPrimary,
										disabled: saving,
										onClick: save,
										children: saving ? t("token.saving") : t("token.save")
									})
								]
							})
						]
					})
				]
			});
		}

		// ---- the card ---------------------------------------------------
		function UsageCard({ wide, t, sessions }) {
			const { state, reload } = useOverview(sessions);
			const [dialogOpen, setDialogOpen] = react.useState(false);
			const [tipPos, setTipPos] = react.useState(null);
			const sourceRef = react.useRef(null);
			const showTip = () => {
				const el = sourceRef.current;
				if (el === null) return;
				const rect = el.getBoundingClientRect();
				const width = 260;
				let left = rect.left + rect.width / 2 - width / 2;
				left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
				setTipPos({ left, top: rect.top - 8 });
			};
			const hideTip = () => setTipPos(null);
			react.useEffect(() => {
				if (tipPos === null) return;
				const hide = () => setTipPos(null);
				window.addEventListener("scroll", hide, true);
				window.addEventListener("resize", hide);
				return () => {
					window.removeEventListener("scroll", hide, true);
					window.removeEventListener("resize", hide);
				};
			}, [tipPos]);
			const { status, data, error } = state;
			const balance = data?.balance;
			const usage = data?.usage;
			const days7 = usage?.days7;
			const days30 = usage?.days30;
			const source = usage?.source;
			const sourceLabel = source === "official" ? t("source.official") : source === "estimate" ? t("source.estimate") : source === "unavailable" ? t("source.unavailable") : "";
			const tipText = source === "official" ? t("tip.official") : source === "estimate" ? t("tip.estimate") : source === "unavailable" ? t("tip.unavailable") : "";
			const balanceText = balance?.ok === true
				? formatCost(balance.total, balance.currency)
				: t("balance.unavailable");
			const dialog = (0, react_jsx_runtime.jsx)(TokenDialog, {
				open: dialogOpen,
				t,
				onClose: (changed) => {
					setDialogOpen(false);
					if (changed) reload();
				}
			});
			if (!wide) {
				const railHint = [t("title"), sourceLabel, status === "ready" ? balanceText : status === "error" ? t("error") : t("loading")].filter((part) => part !== "").join(" · ");
				const dotClass = status === "error" ? styles.railDotErr : status === "ready" && balance?.ok === true ? styles.railDotOk : styles.railDot;
				return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, {
					children: [
						(0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: styles.rail,
							"aria-label": t("title"),
							"aria-haspopup": "dialog",
							"aria-expanded": dialogOpen,
							title: railHint,
							onClick: () => setDialogOpen(true),
							children: [
								(0, react_jsx_runtime.jsx)("span", { className: styles.railMark, children: t("rail") }),
								(0, react_jsx_runtime.jsx)("span", { className: styles.railDot + " " + dotClass, "aria-hidden": "true" })
							]
						}),
						dialog
					]
				});
			}
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, {
				children: [
					(0, react_jsx_runtime.jsxs)("div", {
						className: styles.card,
						children: [
							(0, react_jsx_runtime.jsxs)("div", {
								className: styles.head,
								children: [
									(0, react_jsx_runtime.jsx)("span", { className: styles.title, children: t("title") }),
									sourceLabel !== "" && (0, react_jsx_runtime.jsx)("button", {
										ref: sourceRef,
										type: "button",
										className: styles.source,
										"aria-haspopup": "dialog",
										"aria-expanded": dialogOpen,
										onMouseEnter: showTip,
										onMouseLeave: hideTip,
										onFocus: showTip,
										onBlur: hideTip,
										onClick: () => {
											setTipPos(null);
											setDialogOpen(true);
										},
										children: sourceLabel
									}),
									(0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: styles.refresh,
										"aria-label": t("refresh"),
										title: t("refresh"),
										onClick: reload,
										children: "⟳"
									})
								]
							}),
							status === "error" && (0, react_jsx_runtime.jsx)("div", {
								className: styles.error,
								children: t("error") + ": " + error
							}),
							status === "loading" && days7 === void 0 && (0, react_jsx_runtime.jsx)("div", {
								className: styles.row,
								children: t("loading")
							}),
							status === "ready" && days7 !== void 0 && (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, {
								children: [
									(0, react_jsx_runtime.jsxs)("div", {
										className: styles.row,
										children: [
											(0, react_jsx_runtime.jsx)("span", { children: t("days7") }),
											(0, react_jsx_runtime.jsx)("span", { className: styles.rowValue, children: formatTokens(days7.tokens) + " " + t("tokens") }),
											(0, react_jsx_runtime.jsx)("span", { className: styles.rowCost, children: formatCost(days7.cost, usage.currency) })
										]
									}),
									(0, react_jsx_runtime.jsxs)("div", {
										className: styles.row,
										children: [
											(0, react_jsx_runtime.jsx)("span", { children: t("days30") }),
											(0, react_jsx_runtime.jsx)("span", { className: styles.rowValue, children: formatTokens(days30.tokens) + " " + t("tokens") }),
											(0, react_jsx_runtime.jsx)("span", { className: styles.rowCost, children: formatCost(days30.cost, usage.currency) })
										]
									}),
									(0, react_jsx_runtime.jsx)("div", { className: styles.divider }),
									(0, react_jsx_runtime.jsxs)("div", {
										className: styles.balance,
										children: [
											(0, react_jsx_runtime.jsx)("span", { children: t("balance") }),
											(0, react_jsx_runtime.jsx)("span", { className: styles.balanceValue, children: balanceText }),
											balance?.ok === true && !balance.isAvailable && (0, react_jsx_runtime.jsx)("span", { className: styles.source, children: t("balance.offline") })
										]
									})
								]
							}),
							status === "ready" && (days7 === void 0 || days7 === null) && (0, react_jsx_runtime.jsx)("div", {
								className: styles.row,
								children: t("unavailable")
							})
						]
					}),
					tipPos !== null && sourceLabel !== "" && (0, react_jsx_runtime.jsx)("div", {
						className: styles.tip,
						style: { left: tipPos.left, top: tipPos.top },
						role: "tooltip",
						children: tipText
					}),
					dialog
				]
			});
		}

		// ---- registration ----------------------------------------------
		/** Dictionary namespace owned by this plugin. */
		const NS = "usage-card";
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"title": "用量",
			"rail": "用量",
			"days7": "近 7 天",
			"days30": "近 30 天",
			"tokens": "tokens",
			"balance": "剩餘額度",
			"balance.unavailable": "—",
			"balance.offline": "不可用",
			"source.official": "官方",
			"source.estimate": "估算",
			"source.unavailable": "無數據",
			"source.hint": "查看計算方式 / 設定平台 Token",
			"tip.estimate": "目前：本地估算 token×單價。輸入平台 Token 後改用官方每日用量。",
			"tip.official": "目前：官方平台每日用量。Token 過期自動回退估算。",
			"tip.unavailable": "目前：無可用數據。輸入平台 Token 後改用官方每日用量。",
			"refresh": "刷新",
			"loading": "載入中…",
			"unavailable": "暫無用量數據",
			"error": "無法載入",
			"token.title": "平台 Token 設定",
			"token.desc1": "「官方」數據取自 platform.deepseek.com 用量頁的每日 tokens 與消費，需要平台登入 token（不是 API Key）。",
			"token.desc2": "取得方式：登入 platform.deepseek.com → DevTools → Console 執行：",
			"token.code": "JSON.parse(localStorage.getItem('userToken')).value",
			"token.desc3": "貼上 userToken 並儲存後，卡片即改用官方數據；Token 過期會自動回退估算。",
			"token.placeholder": "貼上 userToken…",
			"token.save": "儲存",
			"token.saving": "驗證中…",
			"token.clear": "清除 Token",
			"token.cancel": "取消",
			"token.close": "關閉",
			"token.errorEmpty": "Token 不能為空",
			"token.copy": "複製",
			"token.copied": "已複製"
		};
		/** English dictionary, checked complete against the zh key set. */
		const en = {
			"title": "Usage",
			"rail": "Use",
			"days7": "Last 7 days",
			"days30": "Last 30 days",
			"tokens": "tokens",
			"balance": "Balance",
			"balance.unavailable": "—",
			"balance.offline": "Unavailable",
			"source.official": "Official",
			"source.estimate": "Estimate",
			"source.unavailable": "No data",
			"source.hint": "View calculation / set Platform token",
			"tip.estimate": "Now: local estimate tokens×price. Enter a Platform token to use official daily usage.",
			"tip.official": "Now: official Platform daily usage. An expired token falls back to estimate.",
			"tip.unavailable": "Now: no data. Enter a Platform token to use official daily usage.",
			"refresh": "Refresh",
			"loading": "Loading…",
			"unavailable": "No usage data yet",
			"error": "Failed to load",
			"token.title": "Platform Token",
			"token.desc1": "Official usage comes from the Platform dashboard (daily tokens & spend) and needs your platform login token, not the API key.",
			"token.desc2": "Get it: sign in to platform.deepseek.com → DevTools → Console, run:",
			"token.code": "JSON.parse(localStorage.getItem('userToken')).value",
			"token.desc3": "Paste the userToken and save; the card switches to official data. An expired token falls back to the estimate.",
			"token.placeholder": "Paste userToken…",
			"token.save": "Save",
			"token.saving": "Validating…",
			"token.clear": "Clear token",
			"token.cancel": "Cancel",
			"token.close": "Close",
			"token.errorEmpty": "Token cannot be empty",
			"token.copy": "Copy",
			"token.copied": "Copied"
		};
		/** Services required by this plugin (activation waits for them). */
		const inject = ["slots", "locale", "sessions"];
		/**
		* Register the usage card into the sidebar foot, above the settings
		* trigger. The target slot is declared by ui-sidebar; registration is
		* deferred through `slots.inject` so activation order does not matter.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => {
				if (typeof document === "undefined") return () => {};
				const tag = document.createElement("style");
				tag.dataset.plugin = "dsh-usage-card";
				tag.dataset.pluginCss = tagId;
				tag.textContent = css;
				document.head.appendChild(tag);
				return () => tag.remove();
			}, "usage-card: styles");
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "usage-card: dictionaries");
			const sessions = ctx.get("sessions");
			ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
				name: "sidebar.footer.action",
				id: "usage-card",
				order: -1,
				locale: NS,
				inject: () => ({ sessions })
			}, UsageCard), "usage-card: sidebar foot card");
		}
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
