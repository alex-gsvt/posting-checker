export const openApiDoc = {
	openapi: '3.0.0',
	info: {
		title: 'Posting Checker API',
		version: '1.0.0',
		description: 'API для проверки постинга на WordPress сайтах',
	},
	servers: [{ url: '/', description: 'Current' }],
	security: [{ ApiKeyAuth: [] }],
	paths: {
		'/health': {
			get: {
				summary: 'Health check',
				description: 'Проверка доступности сервиса',
				tags: ['Health'],
				security: [],
				responses: {
					200: { description: 'OK' },
				},
			},
		},
		'/api/add-task': {
			post: {
				summary: 'Добавить задачи в очередь',
				description: 'Принимает список задач, ставит их в очередь на проверку постинга',
				tags: ['Tasks'],
				security: [{ ApiKeyAuth: [] }],
				requestBody: {
					required: true,
					content: {
						'application/json': {
							schema: {
								type: 'object',
								required: ['owner', 'tasks'],
								properties: {
									owner: { type: 'string', description: 'Идентификатор владельца задач' },
									tasks: {
										type: 'array',
										minItems: 1,
										items: {
											type: 'object',
											required: ['login', 'password', 'site'],
											properties: {
												meta: { type: 'string', description: 'Мета-информация (опционально)' },
												login: { type: 'string', description: 'Логин WordPress' },
												password: { type: 'string', description: 'Пароль WordPress' },
												site: { type: 'string', description: 'URL сайта' },
											},
										},
									},
								},
							},
						},
					},
				},
				responses: {
					200: {
						description: 'Задачи добавлены в очередь',
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: {
										jobId: { type: 'string', format: 'uuid' },
										queued: { type: 'integer' },
									},
								},
							},
						},
					},
					401: { description: 'Unauthorized' },
				},
			},
		},
		'/api/results': {
			get: {
				summary: 'Получить результаты проверок',
				description: 'Возвращает результаты по owner, начиная с since, с лимитом',
				tags: ['Results'],
				security: [{ ApiKeyAuth: [] }],
				parameters: [
					{ name: 'owner', in: 'query', required: true, schema: { type: 'string' }, description: 'Идентификатор владельца' },
					{ name: 'since', in: 'query', schema: { type: 'integer', default: 0 }, description: 'Unix timestamp — от какого времени возвращать результаты' },
					{ name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 1000 }, description: 'Максимум записей в ответе' },
				],
				responses: {
					200: {
						description: 'Список результатов',
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: {
										results: {
											type: 'array',
											items: {
												type: 'object',
												properties: {
													taskId: { type: 'string' },
													owner: { type: 'string' },
													meta: { type: 'string' },
													site: { type: 'string' },
													resultUrl: { type: 'string', nullable: true },
													status: { type: 'string', enum: ['done', 'error'] },
													error: { type: 'string' },
													completedAt: { type: 'integer' },
												},
											},
										},
										count: { type: 'integer' },
									},
								},
							},
						},
					},
					401: { description: 'Unauthorized' },
				},
			},
		},
	},
	components: {
		securitySchemes: {
			ApiKeyAuth: {
				type: 'apiKey',
				in: 'header',
				name: 'x-api-key',
				description: 'API ключ для авторизации',
			},
		},
	},
} as const;
