import { Context, Next } from 'koa'

export const errorHandler = async (ctx: Context, next: Next) => {
  try {
    await next()
  } catch (err: any) {
    console.error('Error:', err)
    
    ctx.status = err.status || 500
    ctx.body = {
      success: false,
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
    
    // 触发 Koa 的错误事件
    ctx.app.emit('error', err, ctx)
  }
}
