import { useGetMode } from "@hooks/useMode"
import { NftCardContentsWrap, NftCardContentWrap, NftCardContent } from "./styled"
import { INFTContents } from "@utils/interFace/nft.interface"

export const KRW = (value: number) => {
    return value.toString().replace(/\d(?=(\d{3})+\b)/g, "$&,")
}
export const NftContents = ({ name, owner, prices, collection }: INFTContents) => {
    const [modeState, setChange] = useGetMode()

    return (
        <NftCardContentsWrap height={"7.5rem"}>
            <NftCardContentWrap width={"90%"}>
                <NftCardContent mode={modeState.mode} height={"1.6rem"} types={"name"}>
                    {name}
                </NftCardContent>
                {!collection ? (
                    <NftCardContent mode={modeState.mode} height={"1.1rem"} types={"owner"}>
                        by {owner?.substring(0, 6) + "..."}
                    </NftCardContent>
                ) : (
                    <NftCardContent mode={modeState.mode} height={"1.1rem"} types={"owner"}></NftCardContent>
                )}
            </NftCardContentWrap>
            <NftCardContentWrap>
                <NftCardContent mode={modeState.mode} height={"1.4rem"} types={"name"}>
                    {prices[1].price} {prices[1].currency} ~
                </NftCardContent>
                <NftCardContent mode={modeState.mode} height={"1.2rem"} types={"krw"}>
                    ≈ {prices[0].currency} {KRW(prices[0].price)}
                </NftCardContent>
            </NftCardContentWrap>
        </NftCardContentsWrap>
    )
}
