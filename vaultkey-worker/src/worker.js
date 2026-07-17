// VaultKey Backend - Cloudflare Worker
// 处理爱发电 webhook 和激活码生成

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // 路由处理
      if (url.pathname === '/webhook/afdian' && request.method === 'POST') {
        return await handleAfdianWebhook(request, env, corsHeaders);
      }
      
      if (url.pathname === '/check-order' && request.method === 'GET') {
        return await handleCheckOrder(request, env, corsHeaders);
      }

      if (url.pathname === '/health') {
        return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

// 处理爱发电 webhook
async function handleAfdianWebhook(request, env, corsHeaders) {
  try {
    const data = await request.json();
    console.log('Received webhook:', JSON.stringify(data, null, 2));

    // 验证签名
    if (!verifyAfdianSignature(data, env.AFDIAN_TOKEN)) {
      console.error('Invalid signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 处理订单
    const { ec, em, data: orderData } = data;
    
    if (ec !== 200) {
      console.error('Order error:', em);
      return new Response(JSON.stringify({ ec: 200, em: 'error' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { type, order } = orderData;
    
    if (type !== 'order') {
      return new Response(JSON.stringify({ ec: 200, em: 'ignored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 验证订单状态（2 = 交易成功）
    if (order.status !== 2) {
      console.log('Order not completed, status:', order.status);
      return new Response(JSON.stringify({ ec: 200, em: 'not_completed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 生成激活码
    const activationCode = await generateActivationCode(order.out_trade_no, env.SECRET_KEY);
    
    // 存储订单和激活码的对应关系
    await env.VAULTKEY_KV.put(
      `order:${order.out_trade_no}`,
      JSON.stringify({
        activationCode,
        userId: order.user_id,
        amount: order.total_amount,
        createdAt: Date.now(),
        planId: order.plan_id
      })
    );

    // 存储用户 ID 到订单的映射（用于前端查询）
    await env.VAULTKEY_KV.put(
      `user:${order.user_id}:latest`,
      order.out_trade_no
    );

    console.log('Order processed:', order.out_trade_no, '-> Code:', activationCode);

    // 返回爱发电要求的格式
    return new Response(JSON.stringify({ ec: 200, em: 'success' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ ec: 500, em: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// 前端查询订单状态
async function handleCheckOrder(request, env, corsHeaders) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Missing userId' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // 查找用户最新的订单
    const orderNo = await env.VAULTKEY_KV.get(`user:${userId}:latest`);
    
    if (!orderNo) {
      return new Response(JSON.stringify({ 
        status: 'no_order',
        message: '未找到订单'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 获取订单详情
    const orderData = await env.VAULTKEY_KV.get(`order:${orderNo}`);
    
    if (!orderData) {
      return new Response(JSON.stringify({ 
        status: 'not_found',
        message: '订单数据不存在'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const order = JSON.parse(orderData);
    
    return new Response(JSON.stringify({ 
      status: 'completed',
      activationCode: order.activationCode,
      amount: order.amount,
      createdAt: order.createdAt
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Check order error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// 验证爱发电签名
function verifyAfdianSignature(data, token) {
  // 爱发电的签名验证逻辑
  // 参考：https://afdian.net/p/885c9b2a6b3111eaacee52540025c377
  
  // 暂时简化：如果 token 为空，则跳过验证（测试环境）
  if (!token) {
    console.warn('No token configured, skipping signature verification');
    return true;
  }

  // 实际生产环境应该实现完整的签名验证
  // 这里先返回 true，后续完善
  return true;
}

// 生成激活码
async function generateActivationCode(orderNo, secret) {
  const timestamp = Date.now();
  const data = {
    id: `order_${orderNo}`,
    ts: timestamp,
    sig: ''
  };

  // 生成签名
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const message = encoder.encode(`${data.id}:${timestamp}`);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, message);
  const signatureArray = Array.from(new Uint8Array(signature));
  data.sig = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // 转换为 base64
  const jsonStr = JSON.stringify(data);
  const base64 = btoa(jsonStr);
  
  return base64;
}
