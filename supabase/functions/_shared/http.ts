export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

export const handlePreflight = (request: Request) => (
  request.method === 'OPTIONS' ? new Response('ok', { headers: corsHeaders }) : null
);
export const errorMessage = (caught: unknown) => (
  caught instanceof Error ? caught.message : 'An unexpected server error occurred.'
);
