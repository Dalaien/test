import { Test, TestingModule } from '@nestjs/testing';
import { MonumentsService } from './monuments.service';

describe('MonumentsService', () => {
  let service: MonumentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MonumentsService],
    }).compile();

    service = module.get<MonumentsService>(MonumentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
