import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { API_PREFIX } from '../src/common/constants';

describe('SaniPay Backend API (e2e)', () => {
  let app: INestApplication;

  const mockPrismaService = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    network: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    systemSetting: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix(API_PREFIX);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());

    await app.init();
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/api/v1/health (GET) should return 200 OK with system status', () => {
    return request(app.getHttpServer())
      .get(`/${API_PREFIX}/health`)
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.service).toBe('SaniPay Backend API');
        expect(res.body.data.version).toBe('1.0.0');
        expect(res.body.data.status).toBe('ok');
        expect(res.body.data.database).toBe('healthy');
      });
  });

  it('/api/v1/airtime/networks (GET) should return active networks list', () => {
    return request(app.getHttpServer())
      .get(`/${API_PREFIX}/airtime/networks`)
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
      });
  });

  it('/api/v1/non-existent-endpoint (GET) should return standard 404 error envelope', () => {
    return request(app.getHttpServer())
      .get(`/${API_PREFIX}/non-existent-endpoint`)
      .expect(404)
      .expect((res) => {
        expect(res.body.success).toBe(false);
        expect(res.body.errorCode).toBe('NOT_FOUND');
        expect(res.body.timestamp).toBeDefined();
      });
  });
});
