import { Gate } from '../layers/Gate';
import { PlateImg } from '../layers/Grain';
import { Keycaps } from '../layers/Keycaps';
import { CAP, CREAM_DISSOLVE, S3 } from '../timeline';

/** 速记键帽依次落下，随后便签纸片上浮落定。 */
export const S3Desk = () => (
  <Gate from={CREAM_DISSOLVE.cut - S3.from}>
    <PlateImg name="plate-c-desk" style={{ inset: 0, width: '100%', height: '100%' }} />
    <Keycaps start={CAP.s3.at + 10 - S3.from} outAt={CAP.s3.outAt - S3.from} />
  </Gate>
);
