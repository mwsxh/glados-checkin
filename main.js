const glados = async () => {
  const notice = []

  const cookie = process.env.GLADOS
  if (!cookie) return

  try {
    // 请求头，模仿浏览器
    const headers = {
      'cookie': cookie,
      'referer': 'https://glados.cloud/console/checkin',
      'origin': 'https://glados.cloud',
      // 'user-agent': 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0',
    }

    // 签到
    const checkin = await fetch('https://glados.cloud/api/user/checkin', {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json;charset=UTF-8' },
      body: '{"token": "glados.cloud"}',
    }).then((r) => r.json())
    if (checkin?.code) throw new Error(checkin?.message)

    // 获取签到后的数据
    const status = await fetch('https://glados.cloud/api/user/status', {
      method: 'GET',
      headers,
    }).then((r) => r.json())
    if (status?.code) throw new Error(status?.message)

    let title = checkin?.message
    if (title) {
      title = title.replace("Checkin! Got ", "签到成功！+")
      title = title.replace(" Points", "积分")
    }
    notice.push(
      // 'Checkin OK',
      `${title}`,
      `Points ${Number(checkin?.list[0]?.balance)}`,
      `Left Days ${Number(status?.data?.leftDays)}`
    )
  } catch (error) {
    let title = error?.message
    if (title) {
      title = title.replace("Checkin Repeats! Please Try Tomorrow", "今天已签，明天再来！")
    }
    notice.push(
      // 'Checkin Error',
      `${title}`,
      `<${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}>`
    )
  }

  return notice
}

// WxPusher
const notify_wxpusher = async (notice, token) => {
  if (!token || !notice) return
  let title = notice[0]
  if (title) {
    title = title.replace("Checkin! Got ", "签到成功！+")
    title = title.replace(" Points", "积分")

    title = title.replace("Checkin Repeats! Please Try Tomorrow", "今天已签，明天再来！")
  }
  // await fetch(`https://wxpusher.zjiecode.com/api/send/message`, { // 标准推送
  await fetch(`https://wxpusher.zjiecode.com/api/send/message/simple-push`, { // 极简推送
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      // appToken: token,
      spt: token, // simple push token
      summary: title,
      content: notice.join('<br>'),
      contentType: 3,
      // uids: option.split(':').slice(2),
    }),
  })
}

// 推送加
const notify_pushplus = async (notice, token) => {
  if (!token || !notice) return
  await fetch(`https://www.pushplus.plus/send`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      token,
      title: notice[0],
      content: notice.join('<br>'),
      template: 'markdown',
    }),
  })
}

// 企业微信机器人
const notify_qyweixin = async (notice, token) => {
  if (!token || !notice) return
  await fetch('https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=' + token, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      msgtype: 'markdown',
      markdown: {
        content: notice.join('<br>')
      }
    }),
  })
}

const notify = async (notice) => {
  // 无需通知
  if (!process.env.NOTIFY || !notice) return

  // 支持多种通知方式，按行分隔
  for (const option of String(process.env.NOTIFY).split('\n')) {
    if (!option) continue
    try {
      if (option.startsWith('console:')) {
        // 仅输出到控制台，便于调试
        for (const line of notice) {
          console.log(line)
        }
      } else if (option.startsWith('wxpusher:')) {
        // 使用 WxPusher 进行简单通知
        notify_wxpusher(notice, option.split(':')[1])
      } else if (option.startsWith('pushplus:')) {
        // 使用 PushPlus 进行通知
        notify_pushplus(notice, option.split(':')[1])
      } else if (option.startsWith('qyweixin:')) {
        // 使用企业微信机器人进行通知，格式为 qyweixin:机器人Webhook中的key值
        notify_qyweixin(notice, option.split(':')[1])
      } else {
        // fallback 还是使用 PushPlus 进行通知
        notify_pushplus(notice, option)
      }
    } catch (error) {
      throw error
    }
  }
}

const main = async () => {
  await notify(await glados())
}

main()
