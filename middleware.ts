import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

const ROLE_ROUTES: Record<string, string[]> = {
  '/dashboard/prescription': ['super_admin','doctor_admin','doctor'],
  '/dashboard/scribe':       ['super_admin','doctor_admin','doctor'],
  '/dashboard/clinical':     ['super_admin','doctor_admin','doctor'],
  '/dashboard/patients':     ['super_admin','doctor_admin','admin','doctor'],
  '/dashboard/portal':       ['super_admin','doctor_admin','admin','doctor'],
  '/dashboard/billing':      ['super_admin','org_owner','doctor_admin','admin','receptionist'],
  '/dashboard/analytics':    ['super_admin','org_owner','doctor_admin','admin','doctor'],
  '/dashboard/settings':     ['super_admin','doctor_admin','admin'],
  '/dashboard/feedback':     ['super_admin','org_owner','doctor_admin','admin','doctor'],
  '/superadmin':             ['super_admin'],
  '/orgdashboard':           ['org_owner','super_admin'],
};

export default withAuth(
  function middleware(req) {
    const token = (req as any).nextauth?.token;
    const role = token?.role as string || 'receptionist';
    const isSuperAdmin = token?.isSuperAdmin as boolean || false;
    const path = req.nextUrl.pathname;

    // Super admin can go anywhere
    if (isSuperAdmin) return NextResponse.next();

    // Check role-based access
    for (const [route, allowedRoles] of Object.entries(ROLE_ROUTES)) {
      if (path.startsWith(route) && !allowedRoles.includes(role)) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ['/dashboard/:path*', '/superadmin/:path*'],
};
