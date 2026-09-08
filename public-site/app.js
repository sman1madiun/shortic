const CONFIG = window.APP_CONFIG;

const sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

function getCodeFromHash() {
  const hash = window.location.hash.replace(/^#/, "");
  return hash.trim().toLowerCase();
}

async function resolveCode(code) {
  const { data, error } = await sb.rpc("get_link_by_code", { p_code: code });
  if (error) {
    console.error("Lookup error:", error.message);
    return null;
  }
  return data && data.length > 0 ? data[0] : null;
}

// Admin-configurable target for visits with an empty fragment (e.g. the
// bare short domain). Returns null when no redirect is set.
async function resolveEmptyFragmentRedirect() {
  const { data, error } = await sb.rpc("get_public_setting", {
    p_key: "empty_fragment_redirect_url",
  });
  if (error) {
    console.error("Settings lookup error:", error.message);
    return null;
  }
  return typeof data === "string" && data.trim() ? data.trim() : null;
}

function isValidTarget(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

async function init() {
  const code = getCodeFromHash();

  // Empty fragment (bare short domain): honor the admin-configured
  // redirect, otherwise stay on the landing page.
  if (!code) {
    const redirectUrl = await resolveEmptyFragmentRedirect();
    if (redirectUrl && isValidTarget(redirectUrl)) {
      window.location.replace(redirectUrl);
    }
    return;
  }

  const link = await resolveCode(code);
  if (!link) return;

  if (!isValidTarget(link.target_url)) {
    console.error("Invalid target URL:", link.target_url);
    return;
  }

  try {
    await sb.rpc("increment_click_count", { p_code: code });
  } catch (err) {
    console.error("Failed to increment click count:", err.message);
  }
  window.location.replace(link.target_url);
}

init();