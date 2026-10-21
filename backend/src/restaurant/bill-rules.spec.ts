import { paymentProblem, tipFor } from './bill-rules';

describe('cuenta de la mesa', () => {
  it('sugiere el 10 % de propina, en pesos redondos', () => {
    expect(tipFor(45000)).toBe(4500);
    expect(tipFor(12345)).toBe(1234);
    expect(tipFor(0)).toBe(0);
  });

  it('con impuesto incluido, la propina es el 10 % del valor sin impuesto (Ley 1935)', () => {
    expect(tipFor(12000, 0.08)).toBe(1111);
    expect(tipFor(11900, 0.19)).toBe(1000);
  });

  it('acepta una sola forma de pago por el total', () => {
    expect(paymentProblem(49500, [{ method: 'CARD', amount: 49500 }])).toBeNull();
  });

  it('acepta dividir entre efectivo y transferencia si suma exacto', () => {
    expect(paymentProblem(50000, [{ method: 'CASH', amount: 20000 }, { method: 'TRANSFER', amount: 30000 }])).toBeNull();
  });

  it('no deja cobrar de menos ni de más', () => {
    expect(paymentProblem(50000, [{ method: 'CASH', amount: 20000 }])).toMatch(/Faltan \$30\.000/);
    expect(paymentProblem(50000, [{ method: 'CASH', amount: 60000 }])).toMatch(/de más/);
  });

  it('pide la forma de pago y que cada pago tenga valor', () => {
    expect(paymentProblem(50000, [])).toMatch(/cómo paga/);
    expect(paymentProblem(50000, [{ method: 'CASH', amount: 0 }, { method: 'CARD', amount: 50000 }])).toMatch(/su valor/);
  });

  it('una mesa sin consumo se libera sin pagos', () => {
    expect(paymentProblem(0, [])).toBeNull();
    expect(paymentProblem(0, [{ method: 'CASH', amount: 1000 }])).toMatch(/sin cobrar/);
  });
});
