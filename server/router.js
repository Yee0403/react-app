const Router = require('koa-router')
const router = new Router({prefix: '/api'})
const parse = require('co-body')
const Config = require('./config')
var crypto = require('crypto')
var querystring = require('querystring')
var fetch = require('node-fetch')
var md5 = crypto.createHash('md5')

var generateToken = require('./token')

router.get('/404', async (ctx, next) => {
  ctx.response.body = '<h1>404 Not Found</h1>'
})

router.post('/auth/type/phoneNumber', async (ctx, next) => {
  var {phoneNumber, password} = await parse.json(ctx.req)
  if (phoneNumber === '15111111111' && password === '123456') {
    let token = generateToken({uid: phoneNumber, password})
    ctx.response.body = JSON.stringify({
      s: 0,
      m: `账号登录成功错误`,
      d: '',
      token
    })
  } else {
    ctx.response.body = JSON.stringify({s: 1, m: '账号信息错误', d: ''})
  }
})

router.post('/auth/type/email', async (ctx, next) => {
  let {email, password} = await parse.json(ctx.req)
  if (email === 'example@react.com' && password === '123456') {
    let token = generateToken({uid: email, password})
    ctx.response.body = {s: 0, m: `Hello， ${email}！`, d: '', token}
  } else {
    ctx.response.body = {s: 1, m: '账号信息错误', d: ''}
  }
})

router.get('/oauth/github/authorize', async (ctx, next) => {
  let params = {
    client_id: Config.GITHUB.client_id,
    scope: Config.GITHUB.scope,
    state: new Date().valueOf()
  }
  let query = querystring.stringify(params)
  let url = `${Config.GITHUB.authorize_url}?${query}`
  ctx.body = {url}
})


router.get('/oauth/github/callback', async (ctx, next) => {
  let params = {
    client_id: Config.GITHUB.client_id,
    client_secret: Config.GITHUB.client_secret,
    code: ctx.query.code
  }
  await fetch(Config.GITHUB.access_url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params)
  })
    .then(res => res.text()) //二进制传文本
    .then(body => {
      let args = body.split('&')
      let arg = args[0].split('=')
      return arg[1]
    })
    .then(async token => {
      // await fetch(`${Config.GITHUB.api_url}?access_token=${token}`)
      //   .then(res => res.json())
      //   .then(res => {
      //     console.log(res)
      //   })
      ctx.redirect(`/auth?access_token=${token}&status=true`)
    })
    .catch(err => {
      ctx.redirect(`/auth?status=false`)
    })
})

function generateRandCode() {
  let code = []
  for (let i = 0; i < 4; i++) {
    code.push(Math.floor(Math.random(10) * 10))
  }
  return code.join('')
}

router.post('/smsverif', async (ctx, next) => {
  let {phoneNumber} = await parse.json(ctx.req)
  let code = generateRandCode()
  let content = `【掘金技术社区】您好，您的验证码是${code}。如非本人操作，请忽略短信。`
  var pass = md5.update(Config.SMS.password).digest('hex')
  var data = {
    u: Config.SMS.user,
    p: pass,
    m: phoneNumber,
    c: content
  }
  let query = querystring.stringify(data)
  try {
    fetch(`${Config.SMS.smsapi}/sms?${query}`, {
      header: {
        'Content-Type': 'text/plain;charset=utf-8'
      }
    })
      .then(res => res.json())
      .then(json => console.log(json))
    ctx.response.body = {s: 1, m: '验证码发送成功', d: code}
  } catch (err) {
    ctx.response.body = {s: 1, m: '验证码发送失败', d: ''}
  }
})

module.exports = router
