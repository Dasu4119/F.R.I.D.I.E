type FridieApiMethod = "GET" | "POST";

export type FridieApiRequest = {
  body?: unknown;
  method: FridieApiMethod;
  path: string;
  userId: string;
};

const REQUEST_TIMEOUT_MS = 15_000;

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

function readConfiguration(): { baseUrl: URL; token: string } | null {
  const rawBaseUrl = process.env.FRIDIE_API_BASE_URL?.trim();
  const token = process.env.FRIDIE_API_SERVICE_TOKEN?.trim();
  if (!rawBaseUrl || !token) return null;

  try {
    const baseUrl = new URL(rawBaseUrl);
    if (baseUrl.protocol !== "https:" && baseUrl.hostname !== "localhost") return null;
    return { baseUrl, token };
  } catch {
    return null;
  }
}

function publicErrorMessage(status: number, payload: unknown): string {
  if (status >= 500) return "The F.R.I.D.I.E. data service is temporarily unavailable.";
  if (payload && typeof payload === "object" && "detail" in payload) {
    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === "string" && detail.length <= 240) return detail;
  }
  return "The F.R.I.D.I.E. data service could not complete this request.";
}

export async function requestFridieApi(input: FridieApiRequest): Promise<Response> {
  const configuration = readConfiguration();
  if (!configuration) {
    return errorResponse(
      "service_unconfigured",
      "Persistent storage is not configured for this deployment.",
      503,
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const url = new URL(input.path, configuration.baseUrl);
    const response = await fetch(url, {
      method: input.method,
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${configuration.token}`,
        "Content-Type": "application/json",
        "X-FRIDIE-User": input.userId,
      },
      body: input.body === undefined ? undefined : JSON.stringify(input.body),
    });

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return errorResponse(
        "invalid_service_response",
        "The F.R.I.D.I.E. data service returned an invalid response.",
        502,
      );
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return errorResponse(
          "service_authentication_failed",
          "Persistent storage authentication is unavailable. Try again later.",
          503,
        );
      }
      return errorResponse(
        `service_${response.status}`,
        publicErrorMessage(response.status, payload),
        response.status,
      );
    }

    return Response.json({ data: payload }, { status: response.status });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "AbortError";
    return errorResponse(
      timedOut ? "service_timeout" : "service_unreachable",
      timedOut
        ? "Persistent storage took too long to respond. Try again."
        : "Persistent storage could not be reached. Try again.",
      timedOut ? 504 : 502,
    );
  } finally {
    clearTimeout(timeout);
  }
}
