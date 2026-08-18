window.__ModuleLoader__.load({
  id: "dsh-weave",
  factory: (require) => {
    const module = { exports: {} };
    const exports = module.exports;
    const React = require("react");
    const h = React.createElement;
    const inject = ["slots", "connection"];

    function apply(ctx) {
      const call = async (endpoint, args = {}) => {
        const response = await ctx.connection.rpc.call("/dsh-weave", endpoint, { args });
        if (!response?.ok) throw new Error(response?.error?.message ?? "Weave request failed");
        return response.value;
      };
      function WeaveSettings() {
        const [ticket, setTicket] = React.useState("");
        const [draft, setDraft] = React.useState("");
        const [endpoints, setEndpoints] = React.useState([]);
        const [status, setStatus] = React.useState({ relayMode: "default", peerCount: 0 });
        const [error, setError] = React.useState("");
        const [working, setWorking] = React.useState(false);
        const refresh = React.useCallback(async () => {
          const [ticketResult, endpointResult, statusResult] = await Promise.all([call("ticket"), call("endpoints"), call("status")]);
          setTicket(ticketResult.ticket); setEndpoints(endpointResult.endpoints); setStatus(statusResult); setError("");
        }, []);
        React.useEffect(() => { void refresh().catch((cause) => setError(String(cause.message ?? cause))); }, [refresh]);
        const trust = async (event) => {
          event.preventDefault(); if (!draft.trim() || working) return;
          setWorking(true);
          try { await call("trust", { ticket: draft.trim() }); setDraft(""); await refresh(); }
          catch (cause) { setError(String(cause.message ?? cause)); }
          finally { setWorking(false); }
        };
        const field = { width: "100%", boxSizing: "border-box", padding: "10px 11px", border: "1px solid var(--dsw-alias-border-l2, #ddd)", borderRadius: 9, background: "var(--dsw-alias-bg-layer-1, #fff)", color: "inherit", outline: 0 };
        const button = { minHeight: 36, padding: "0 12px", border: "1px solid var(--dsw-alias-border-l2, #ddd)", borderRadius: 9, background: "var(--dsw-alias-bg-layer-1, #fff)", color: "inherit", cursor: "pointer" };
        return h("div", { style: { width: "min(720px, 100%)", padding: "8px 4px 48px" } },
          h("div", { style: { marginBottom: 28 } }, h("h2", { style: { margin: "0 0 6px", fontSize: 22 } }, "Weave network"), h("p", { style: { margin: 0, color: "var(--dsw-alias-text-secondary, #777)", lineHeight: 1.5 } }, "Pair trusted DSH hosts over Iroh. Chat and other plugins consume this network without owning its identity or relay settings.")),
          error && h("p", { role: "alert", style: { padding: 10, borderRadius: 9, background: "rgba(210,48,48,.08)", color: "var(--dsw-alias-state-error-primary, #b42318)" } }, error),
          h("section", { style: { marginBottom: 30 } },
            h("h3", { style: { margin: "0 0 5px", fontSize: 15 } }, "This host"),
            h("p", { style: { margin: "0 0 10px", color: "var(--dsw-alias-text-secondary, #777)", fontSize: 13 } }, `Relay: ${status.relayMode} · ${status.peerCount} trusted peer${status.peerCount === 1 ? "" : "s"}`),
            h("div", { style: { display: "flex", gap: 8 } }, h("textarea", { readOnly: true, value: ticket, rows: 3, "aria-label": "This host Iroh ticket", style: { ...field, resize: "vertical", fontFamily: "ui-monospace, monospace", fontSize: 11 } }), h("button", { type: "button", onClick: () => navigator.clipboard?.writeText(ticket), style: button }, "Copy"))
          ),
          h("section", { style: { marginBottom: 30 } },
            h("h3", { style: { margin: "0 0 5px", fontSize: 15 } }, "Pair another host"),
            h("p", { style: { margin: "0 0 10px", color: "var(--dsw-alias-text-secondary, #777)", fontSize: 13 } }, "Paste a ticket from a host you trust. Its endpoint identity and latest addressing hints are saved locally."),
            h("form", { onSubmit: trust, style: { display: "flex", gap: 8 } }, h("input", { value: draft, onChange: (event) => setDraft(event.target.value), placeholder: "Iroh endpoint ticket", style: field }), h("button", { type: "submit", disabled: working || !draft.trim(), style: button }, working ? "Pairing…" : "Pair"))
          ),
          h("section", null,
            h("h3", { style: { margin: "0 0 10px", fontSize: 15 } }, "Paired hosts"),
            h("div", { style: { display: "grid", gap: 8 } }, endpoints.map((endpoint) => h("div", { key: endpoint.peerId, style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "11px 12px", borderRadius: 10, background: "var(--dsw-alias-bg-layer-2, #f6f7f8)" } }, h("span", { style: { overflow: "hidden", textOverflow: "ellipsis", fontFamily: "ui-monospace, monospace", fontSize: 12 } }, endpoint.peerId), h("small", { style: { color: "var(--dsw-alias-color-primary, #5870d8)" } }, "Trusted")))),
            endpoints.length === 0 && h("p", { style: { color: "var(--dsw-alias-text-secondary, #777)", fontSize: 13 } }, "No paired hosts yet.")
          )
        );
      }
      ctx.slots.inject("settings.section", () => ctx.slots.register({ name: "settings.section", id: "weave", order: 35, label: () => "Weave" }, WeaveSettings));
    }
    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
