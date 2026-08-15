(() => {
  const currentScript = document.currentScript;
  if (!currentScript || currentScript.dataset.loaded === "true") return;

  const baseUrl = new URL(".", currentScript.src);
  const widgetUrl = new URL("./demo?widget=1", baseUrl);
  const frame = document.createElement("iframe");
  frame.title = "Loup employee benefit widget";
  frame.src = widgetUrl.toString();
  frame.loading = "lazy";
  frame.style.width = "100%";
  frame.style.minHeight = "680px";
  frame.style.border = "0";
  frame.style.borderRadius = "24px";
  frame.style.background = "#f8f3eb";
  frame.setAttribute("allow", "clipboard-write");
  frame.dataset.loupWidget = "true";

  currentScript.dataset.loaded = "true";
  currentScript.parentNode?.insertBefore(frame, currentScript.nextSibling);
})();