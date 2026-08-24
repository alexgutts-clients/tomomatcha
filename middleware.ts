import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/* ============================================================================
 * Protección de rutas.
 *
 * Todo requiere sesión salvo lo que está en `isPublic`. La tarjeta de lealtad
 * (`/tarjeta/<token>`) es pública a propósito: es lo que abre el cliente al
 * escanear su QR, y el token es imposible de adivinar.
 *
 * Las páginas redirigen a iniciar sesión; las rutas de API responden 401 en
 * JSON, para que una imagen o una petición en segundo plano no acaben
 * mostrando la pantalla de acceso dentro de un `<img>`.
 *
 * Si Clerk no está configurado todavía, el middleware no se activa y la
 * aplicación muestra la pantalla que explica qué variables faltan, en lugar de
 * caerse con un error de arranque.
 * ========================================================================== */

const isPublic = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/tarjeta/(.*)",
  "/api/health",
]);

const isApi = createRouteMatcher(["/api/(.*)"]);

const clerkConfigured =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !!process.env.CLERK_SECRET_KEY;

const withClerk = clerkMiddleware(
  async (auth, request) => {
    if (isPublic(request)) return NextResponse.next();

    const { userId, redirectToSignIn } = await auth();
    if (userId) return NextResponse.next();

    if (isApi(request)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    return redirectToSignIn({ returnBackUrl: request.url });
  },
  // Sin esto, Clerk redirige a su página alojada en `accounts.dev` en lugar de
  // a la pantalla de inicio de sesión de la propia aplicación.
  { signInUrl: "/sign-in", signUpUrl: "/sign-up" },
);

export default function middleware(
  ...args: Parameters<typeof withClerk>
): ReturnType<typeof withClerk> | NextResponse {
  if (!clerkConfigured) return NextResponse.next();
  return withClerk(...args);
}

export const config = {
  matcher: [
    // Todo menos archivos estáticos y assets de Next.
    "/((?!_next|.*\\..*).*)",
    "/(api|trpc)(.*)",
  ],
};
