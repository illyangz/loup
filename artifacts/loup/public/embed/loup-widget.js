(() => {
  const currentScript = document.currentScript;
  if (!currentScript || currentScript.dataset.loaded === "true") return;

  const baseUrl = new URL(".", currentScript.src);
  const widgetUrl = new URL("./demo?widget=1", baseUrl);

  // P1-7: the host page's server exchanges its per-institution widget secret
  // for a short-lived employee token (POST /v1/widget/token) BEFORE rendering
  // this script tag, then sets data-employee-token on it. The secret itself
  // is never present in the browser. Without a token, the widget falls back
  // to self-bootstrapping a generic demo session (standalone preview mode).
  const employeeToken = currentScript.dataset.employeeToken;
  if (employeeToken) widgetUrl.searchParams.set("token", employeeToken);

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