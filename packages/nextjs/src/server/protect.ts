import type { AuthObject, SignedInAuthObject } from '@clerk/backend/internal';
import { constants } from '@clerk/backend/internal';
import type {
  CheckAuthorizationParamsWithCustomPermissions,
  CheckAuthorizationWithCustomPermissions,
} from '@clerk/types';

import { constants as nextConstants } from '../constants';
import { SIGN_IN_URL } from './constants';

type AuthProtectOptions = { redirectUrl?: string };

/**
 * @experimental
 * This function is experimental as it throws a Nextjs notFound error if user is not authenticated or authorized.
 * In the future we would investigate a way to throw a more appropriate error that clearly describes the not authorized of authenticated status.
 */
export interface AuthProtect {
  (params?: CheckAuthorizationParamsWithCustomPermissions, options?: AuthProtectOptions): SignedInAuthObject;
  (
    params?: (has: CheckAuthorizationWithCustomPermissions) => boolean,
    options?: AuthProtectOptions,
  ): SignedInAuthObject;
  (options?: AuthProtectOptions): SignedInAuthObject;
}

export const createProtect = (opts: {
  request: Request;
  authObject: AuthObject;
  /**
   * middleware and pages throw a notFound error if signed out
   * but the middleware needs to throw an error it can catch
   * use this callback to customise the behavior
   */
  notFound: () => never;
  /**
   * see {@link notFound} above
   */
  redirect: (url: string) => void;
  /**
   * protect() in middleware redirects to signInUrl if signed out
   * protect() in pages throws a notFound error if signed out
   * use this callback to customise the behavior
   */
  redirectToSignIn?: () => void;
}): AuthProtect => {
  const { redirectToSignIn, authObject, redirect, notFound, request } = opts;

  return ((...args: any[]) => {
    const paramsOrFunction = args[0]?.redirectUrl
      ? undefined
      : (args[0] as
          | CheckAuthorizationParamsWithCustomPermissions
          | ((has: CheckAuthorizationWithCustomPermissions) => boolean));
    const redirectUrl = (args[0]?.redirectUrl || args[1]?.redirectUrl) as string | undefined;

    const handleUnauthenticated = () => {
      if (redirectUrl) {
        return redirect(redirectUrl);
      }
      if (isPageRequest(request)) {
        // TODO: Handle runtime values. What happens if runtime values are set in middleware and in ClerkProvider as well?
        return redirectToSignIn ? redirectToSignIn() : redirect(SIGN_IN_URL);
      }
      return notFound();
    };

    const handleUnauthorized = () => {
      if (redirectUrl) {
        return redirect(redirectUrl);
      }
      return notFound();
    };

    /**
     * User is not authenticated
     */
    if (!authObject.userId) {
      return handleUnauthenticated();
    }

    /**
     * User is authenticated
     */
    if (!paramsOrFunction) {
      return authObject;
    }

    /**
     * if a function is passed and returns false then throw not found
     */
    if (typeof paramsOrFunction === 'function') {
      if (paramsOrFunction(authObject.has)) {
        return authObject;
      }
      return handleUnauthorized();
    }

    /**
     * Checking if user is authorized when permission or role is passed
     */
    if (authObject.has(paramsOrFunction)) {
      return authObject;
    }

    return handleUnauthorized();
  }) as AuthProtect;
};

const isServerActionRequest = (req: Request) => {
  return (
    !!req.headers.get(nextConstants.Headers.NextUrl) &&
    (req.headers.get(constants.Headers.Accept)?.includes('text/x-component') ||
      req.headers.get(constants.Headers.ContentType)?.includes('multipart/form-data') ||
      !!req.headers.get(nextConstants.Headers.NextAction))
  );
};

const isPageRequest = (req: Request): boolean => {
  return (
    req.headers.get(constants.Headers.SecFetchDest) === 'document' ||
    req.headers.get(constants.Headers.Accept)?.includes('text/html') ||
    (!!req.headers.get(nextConstants.Headers.NextUrl) && !isServerActionRequest(req))
  );
};

// In case we want to handle router handlers and server actions differently in the future
// const isRouteHandler = (req: Request) => {
//   return !isPageRequest(req) && !isServerAction(req);
// };
