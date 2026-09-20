import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2.116.0';

type FunctionContext = {
  admin: SupabaseClient;
  user: User;
};

const readNamedKey = (modernName: string, legacyName: string) => {
  const modernValue = Deno.env.get(modernName);
  if (modernValue) {
    try {
      const parsed = JSON.parse(modernValue) as Record<string, string>;
      if (parsed.default) return parsed.default;
    } catch {
      // Fall through to the legacy key while projects finish migrating.
    }
  }
  return Deno.env.get(legacyName);
};

export async function requireUser(request: Request): Promise<FunctionContext> {
  const authorization = request.headers.get('Authorization');
  const accessToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!accessToken) throw new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = readNamedKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY');
  const secretKey = readNamedKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !publishableKey || !secretKey) {
    throw new Response(JSON.stringify({ error: 'Server configuration is incomplete' }), { status: 500 });
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user }, error } = await userClient.auth.getUser(accessToken);
  if (error || !user) throw new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 });

  return {
    admin: createClient(supabaseUrl, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }),
    user,
  };
}
