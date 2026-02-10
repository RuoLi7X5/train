/**
 * 统一的日志系统
 * 支持不同级别的日志记录和格式化输出
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: Record<string, any>
  error?: Error
}

class Logger {
  private static instance: Logger
  private isDevelopment: boolean

  private constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development'
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  private formatLog(entry: LogEntry): string {
    const { timestamp, level, message, context, error } = entry
    let logMessage = `[${timestamp}] [${level}] ${message}`

    if (context && Object.keys(context).length > 0) {
      logMessage += `\nContext: ${JSON.stringify(context, null, 2)}`
    }

    if (error) {
      logMessage += `\nError: ${error.message}`
      if (error.stack && this.isDevelopment) {
        logMessage += `\nStack: ${error.stack}`
      }
    }

    return logMessage
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
    }

    const formattedLog = this.formatLog(entry)

    // 根据级别使用不同的console方法
    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedLog)
        // TODO: 在生产环境中，可以发送到错误跟踪服务（如 Sentry）
        break
      case LogLevel.WARN:
        console.warn(formattedLog)
        break
      case LogLevel.INFO:
        console.info(formattedLog)
        break
      case LogLevel.DEBUG:
        if (this.isDevelopment) {
          console.debug(formattedLog)
        }
        break
    }

    // TODO: 可以将日志保存到文件或发送到日志服务
  }

  public debug(message: string, context?: Record<string, any>) {
    this.log(LogLevel.DEBUG, message, context)
  }

  public info(message: string, context?: Record<string, any>) {
    this.log(LogLevel.INFO, message, context)
  }

  public warn(message: string, context?: Record<string, any>) {
    this.log(LogLevel.WARN, message, context)
  }

  public error(message: string, error?: Error, context?: Record<string, any>) {
    this.log(LogLevel.ERROR, message, context, error)
  }

  /**
   * API 请求日志
   */
  public apiRequest(method: string, url: string, context?: Record<string, any>) {
    this.info(`API Request: ${method} ${url}`, context)
  }

  /**
   * API 响应日志
   */
  public apiResponse(method: string, url: string, status: number, duration: number) {
    this.info(`API Response: ${method} ${url}`, { status, duration: `${duration}ms` })
  }

  /**
   * 数据库查询日志
   */
  public dbQuery(query: string, duration: number, context?: Record<string, any>) {
    this.debug(`DB Query: ${query}`, { ...context, duration: `${duration}ms` })
  }
}

export const logger = Logger.getInstance()
