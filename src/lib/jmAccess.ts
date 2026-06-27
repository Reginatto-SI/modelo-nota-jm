// Acesso mínimo solicitado: credencial fixa e sessão limitada ao navegador aberto.
const JM_ACCESS_STORAGE_KEY = "modeloNotaJmAccess";
const JM_ACCESS_STORAGE_VALUE = "true";
const JM_ACCESS_CHANGED_EVENT = "modeloNotaJmAccessChanged";

const JM_ACCESS_CREDENTIALS = {
  email: "faturamento@jmassessoriamt.com.br",
  password: "12345678",
} as const;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

// Evento local mantém menu, guarda de rota e botão de sair sincronizados na mesma aba.
function notifyJmAccessChanged() {
  window.dispatchEvent(new Event(JM_ACCESS_CHANGED_EVENT));
}

export function isJmAuthenticated() {
  return sessionStorage.getItem(JM_ACCESS_STORAGE_KEY) === JM_ACCESS_STORAGE_VALUE;
}

export function loginJmAccess(email: string, password: string) {
  const authenticated =
    normalizeEmail(email) === JM_ACCESS_CREDENTIALS.email && password === JM_ACCESS_CREDENTIALS.password;

  if (authenticated) {
    sessionStorage.setItem(JM_ACCESS_STORAGE_KEY, JM_ACCESS_STORAGE_VALUE);
    notifyJmAccessChanged();
  }

  return authenticated;
}

export function logoutJmAccess() {
  sessionStorage.removeItem(JM_ACCESS_STORAGE_KEY);
  notifyJmAccessChanged();
}

export function subscribeJmAccessChanged(callback: () => void) {
  window.addEventListener(JM_ACCESS_CHANGED_EVENT, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(JM_ACCESS_CHANGED_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
