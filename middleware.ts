import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

const ROLE_ROUTES: Record<string, string[]> = {
  '/dashboard/prescription': ['super_admin','doctor_admin','doctor'],
  '/dashboard/scribe':       ['super_admin','doctor_admin','doctor'],
  '/dashboard/clinical':     ['super_admin','doctor_admin','doctor'],
  '/dashboard/patients':     ['super_admin','doctor_admin','admin','doctor'],
  '/dashboard/portal':       ['super_admin','doctor_admin','admin','doctor'],
  '/dashboard/billing':      ['super_admin','doctor_admin','admin','receptionist'],
  '/dashboard/analytics':    ['super_admin','doctor_admin','admin','doctor'],
  '/dashboard/settings':     ['super_admin','doctor_admin','admin'],
  '/dashboard/feedback':     ['super_admin','doctor_admin','admin','doctor'],
  '/dashboard/messages':     ['super_admin','doctor_admin','admin','doctor','receptionist'],
  '/superadmin':             ['super_admin'],
  '/orgdashboard':           ['org_owner','super_admin'],
};

export default withAuth(
  function middleware(req) {
    const token = (req as any).nextauth?.token;
    const role = token?.role as string || 'receptionist';
    const isSuperAdmin = token?.isSuperAdmin as boolean || false;
    const isPatient = token?.isPatient as boolean || false;
    const path = req.nextUrl.pathname;

    // Patient: can only access /patient/* — redirect to patient dashboard if they try staff routes
    if (isPatient) {
      if (!path.startsWith('/patient')) {
        return NextResponse.redirect(new URL('/patient/dashboard', req.url));
      }
      return NextResponse.next();
    }

    // Staff: cannot access /patient/* routes
    if (path.startsWith('/patient')) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Super admin can go anywhere (staff side)
    if (isSuperAdmin) return NextResponse.next();

    // Org owner belongs exclusively to /orgdashboard — block all /dashboard/* access
    if (role === 'org_owner' && path.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/orgdashboard', req.url));
    }

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
      authorized: ({ token, req }) => {
        // Allow unauthenticated access to patient register page
        if (req.nextUrl.pathname.startsWith('/patient/register')) return true;
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ['/dashboard/:path*', '/superadmin/:path*', '/orgdashboard/:path*', '/patient/:path*'],
};
