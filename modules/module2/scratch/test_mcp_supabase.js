const { spawn } = require('child_process');

const uri = 'postgresql://postgres:CNCdatda45%23%40@db.tlqdmyzpooiadaqnzowc.supabase.co:5432/postgres';
const proc = spawn('cmd.exe', ['/c', 'npx', '-y', '@modelcontextprotocol/server-postgres', uri]);

proc.stdout.on('data', (d) => {
  console.log('MCP OUT:\n' + d.toString());
});

proc.stderr.on('data', (d) => {
  console.error('MCP ERR:\n' + d.toString());
});

const send = (obj) => {
  const line = JSON.stringify(obj) + '\n';
  proc.stdin.write(line);
};

// Step 1: Initialize
setTimeout(() => {
  send({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0' }
    }
  });
}, 1000);

// Step 2: notifications/initialized + list tables
setTimeout(() => {
  send({ jsonrpc: '2.0', method: 'notifications/initialized' });
  send({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'query',
      arguments: {
        sql: "SELECT 'materials' as tbl, count(*) as cnt FROM public.materials UNION ALL SELECT 'cad_assets', count(*) FROM public.cad_assets UNION ALL SELECT 'cad_versions', count(*) FROM public.cad_versions UNION ALL SELECT 'cam_jobs', count(*) FROM public.cam_jobs UNION ALL SELECT 'machine_profiles', count(*) FROM public.machine_profiles UNION ALL SELECT 'cutting_tools', count(*) FROM public.cutting_tools UNION ALL SELECT 'profiles', count(*) FROM public.profiles UNION ALL SELECT 'toolpath_operations', count(*) FROM public.toolpath_operations UNION ALL SELECT 'audit_events', count(*) FROM public.audit_events;"
      }
    }
  });
}, 2500);

setTimeout(() => {
  proc.kill();
  process.exit(0);
}, 6500);
