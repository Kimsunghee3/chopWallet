import { useGetMode } from "@hooks/useMode"
import { CollectionOwnerWrap, CollectionSubject } from "./styled/NftStandardInformation.styled"
import { INFTStandardCreater } from "@utils/interFace/nft.interface"
import { ImageForm } from "@styled/index"

export const NftStandardInformationOwner = ({ creator }: INFTStandardCreater) => {
    const [modeState, setModeState] = useGetMode()
    return (
        <CollectionOwnerWrap mode={modeState.mode}>
            <CollectionSubject>Create by {creator}</CollectionSubject>
        </CollectionOwnerWrap>
    )
}
