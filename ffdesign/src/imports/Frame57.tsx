import imgImage102 from "figma:asset/f8b639f9120aec392cf4052ace231cd249d84cd1.png";
import imgImage103 from "figma:asset/36214f9cfb98340fcbc654e013228430fc23ee28.png";
import imgImage105 from "figma:asset/9369e43396af2bdc0ed8c6cbf3d023c16bb2b460.png";
import imgGrokImage from "figma:asset/1893368d705218527efd9ade041367862791d2cb.png";

function Frame1() {
  return (
    <div className="absolute content-stretch flex gap-[24px] h-[481px] items-center left-[32px] top-[219px] w-[1213px]">
      <div className="h-[483px] relative shadow-[0px_19px_46.7px_-14px_rgba(0,0,0,0.45)] shrink-0 w-[389px]" data-name="image 102">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage102} />
      </div>
      <div className="h-[483px] relative shadow-[0px_19px_46.7px_-14px_rgba(0,0,0,0.45)] shrink-0 w-[389px]" data-name="image 103">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage103} />
      </div>
      <div className="h-[483px] relative shrink-0 w-[386px]" data-name="image 105">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img alt="" className="absolute h-[101.73%] left-0 max-w-none top-[-0.86%] w-full" src={imgImage105} />
        </div>
      </div>
    </div>
  );
}

export default function Frame() {
  return (
    <div className="bg-[#e5e5e2] relative size-full">
      <Frame1 />
      <div className="absolute h-[64px] left-[32px] top-[19px] w-[123px]" data-name="Grok Image">
        <img alt="" className="block max-w-none size-full" height="64" src={imgGrokImage} width="123" />
      </div>
      <div className="absolute font-['Space_Mono:Regular',sans-serif] leading-[1.25] left-[calc(8.33%+69.33px)] not-italic text-[16px] text-black top-[27px] tracking-[-0.64px] uppercase whitespace-nowrap">
        <p className="mb-0">Frequent Flyer</p>
        <p>Los Angeles</p>
      </div>
      <p className="absolute font-['Space_Mono:Regular',sans-serif] leading-[1.25] left-[calc(83.33%-13.67px)] not-italic text-[16px] text-black top-[37px] tracking-[-0.64px] uppercase">guides</p>
      <p className="absolute font-['Space_Mono:Regular',sans-serif] leading-[1.25] left-[calc(75%-34px)] not-italic text-[16px] text-black top-[37px] tracking-[-0.64px] uppercase">events</p>
      <p className="absolute font-['Space_Mono:Regular',sans-serif] leading-[1.25] left-[calc(83.33%-63.67px)] not-italic text-[16px] text-black top-[37px] tracking-[-0.64px] uppercase">map</p>
      <p className="absolute decoration-solid font-['Space_Mono:Regular',sans-serif] leading-[1.25] left-[32px] not-italic text-[16px] text-black top-[133px] tracking-[-0.64px] underline uppercase">Upcoming</p>
      <p className="absolute font-['Space_Grotesk:Regular',sans-serif] font-normal leading-[1.25] left-[32px] text-[16px] text-black top-[170px] tracking-[-0.64px]">*Hover over a flyer for details</p>
      <p className="absolute font-['Space_Mono:Regular',sans-serif] leading-[1.25] left-[122px] not-italic text-[#5d39ac] text-[16px] top-[133px] tracking-[-0.64px] uppercase">archive</p>
    </div>
  );
}