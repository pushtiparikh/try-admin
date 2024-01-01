import React, { useState, useEffect } from 'react';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Spin,
} from 'antd';
import { toast } from 'react-toastify';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import LanguageList from '../../../components/language-list';
import TextArea from 'antd/es/input/TextArea';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import {
  disableRefetch,
  removeFromMenu,
  setMenuData,
} from '../../../redux/slices/menu';
import sellerCategory from '../../../services/seller/category';
import { IMG_URL } from '../../../configs/app-global';
import { useTranslation } from 'react-i18next';
import MediaUpload from '../../../components/upload';
import requestModelsService from 'services/seller/request-models';
import { fetchSellerRequestModels } from 'redux/slices/request-models';
import { DebounceSelect } from 'components/search';
import SellerCategories from './index'
import { fetchSellerCategory } from 'redux/slices/category';

const SellerCategoryEdit = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [categoryId, setCategoryId] = useState(null);
  const { activeMenu } = useSelector((state) => state.menu, shallowEqual);
  const { params } = useSelector((state) => state.requestModels, shallowEqual);
  const { user } = useSelector((state) => state.auth, shallowEqual);
  const { state } = useLocation();

  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(
    activeMenu.data?.image ? [activeMenu.data?.image] : []
  );
  const [form] = Form.useForm();
  const [loadingBtn, setLoadingBtn] = useState(false);
  const [error, setError] = useState(null);

  const { uuid } = useParams();
  const { defaultLang, languages } = useSelector(
    (state) => state.formLang,
    shallowEqual
  );

  useEffect(() => {
    return () => {
      const data = form.getFieldsValue(true);
      dispatch(setMenuData({ activeMenu, data }));
      dispatch(
        fetchSellerCategory({
          ...params,
          type: state?.parentId ? 'sub_main' : 'main',
          parent_id: state?.parentId,
          shop_id: user?.shop_id
        })
      );
    };
  }, []);

  const createImage = (name) => {
    return {
      name,
      url: IMG_URL + name,
    };
  };

  const getLanguageField = (list) => Object.assign({}, ...list);

  const getCategory = (alias) => {
    setLoading(true);
    sellerCategory
      .getById(alias)
      .then((res) => {
        let category = res.data;
        const body = {
          ...category,
          title: getLanguageField(
            category.translations.map((translation) => ({
              [translation.locale]: translation.title,
            }))
          ),
          description: getLanguageField(
            category.translations.map((translation) => ({
              [translation.locale]: translation.description,
            }))
          ),
          image: [createImage(category.img)],
          keywords: category.keywords.split(','),
          id: category.id,
          parent_id: {
            label: category.parent?.translation?.title,
            value: category.parent_id,
            key: category.parent_id,
          },
        };
        setCategoryId(category.id);

        form.setFieldsValue(body);
        setImage([createImage(category.img)]);
      })
      .finally(() => {
        setLoading(false);
        dispatch(disableRefetch(activeMenu));
      });
  };

  const onFinish = (values) => {
    setLoadingBtn(true);
    const body = {
      id: values.id,
      type: 'category',
      data: {
        ...values,
        type: state?.parentId ? 'sub_main' : 'main',
        active: values.active ? 1 : 0,
        keywords: values.keywords.join(','),
        parent_id: state?.parentId || values.parent_id?.value,
        images: image?.map((img) => img.name),
      },
    };
    const paramsData = {
      ...params,
      shop_id: user?.shop_id,
      type: state?.parentId ? 'sub_main' : 'main',
      parent_id: state?.parentId,
    };
    const nextUrl = state?.parentId
      ? `seller/category/${state?.parentUuid}`
      : 'seller/categories';
    requestModelsService
      .requestChange(body)
      .then(() => {
        toast.success(t('successfully.updated'));
        dispatch(removeFromMenu({ ...activeMenu, nextUrl }));
        dispatch(fetchSellerRequestModels(paramsData));
        navigate(`/${nextUrl}`, { state: { tab: 'request' } });
      })
      .catch((err) => setError(err.response.data.params))
      .finally(() => setLoadingBtn(false));
  };

  useEffect(() => {
      getCategory(uuid);
  }, [activeMenu.refetch, uuid, state?.parentId]);

  async function fetchUserCategoryList() {
    const params = { perPage: 100, type: state?.parentId ? 'main' : 'sub_shop', active: 1 };
    return sellerCategory.selectPaginate(params).then((res) =>
      res.data.map((item) => ({
        label: item.translation?.title,
        value: item.id,
        key: item.id,
      }))
    );
  }

  return (
    <>
    <Card title={state?.parentId ? t('edit.sub.category') :t('edit.category')} extra={<LanguageList />}>
      {!loading ? (
        <Form
          name='basic'
          layout='vertical'
          onFinish={onFinish}
          initialValues={{
            active: true,
            ...activeMenu.data,
          }}
          form={form}
        >
          <Row gutter={12}>
            <Form.Item name='id' hidden>
              <InputNumber />
            </Form.Item>
            <Col span={12}>
              {languages.map((item, index) => (
                <Form.Item
                  key={item.title + index}
                  label={t('name')}
                  name={['title', item.locale]}
                  help={
                    error
                      ? error['title'][defaultLang]
                        ? error['title'][defaultLang][0]
                        : null
                      : null
                  }
                  validateStatus={error ? 'error' : 'success'}
                  rules={[
                    {
                      required: item.locale === defaultLang,
                      message: t('required'),
                    },
                  ]}
                  hidden={item.locale !== defaultLang}
                >
                  <Input />
                </Form.Item>
              ))}
            </Col>

            <Col span={12}>
              {languages.map((item, index) => (
                <Form.Item
                  key={item.locale + index}
                  label={t('description')}
                  name={['description', item.locale]}
                  rules={[
                    {
                      required: item.locale === defaultLang,
                      message: t('required'),
                    },
                  ]}
                  hidden={item.locale !== defaultLang}
                >
                  <TextArea rows={4} />
                </Form.Item>
              ))}
            </Col>
            <Col span={12}>
              <Form.Item
                label={t('keywords')}
                name='keywords'
                rules={[{ required: true, message: t('required') }]}
              >
                <Select mode='tags' style={{ width: '100%' }}></Select>
              </Form.Item>
            </Col>
            {!state?.parentId && (
            <Col span={12}>
              <Form.Item
                label={t('parent.category')}
                name='parent_id'
                rules={[{ required: true, message: t('required') }]}
              >
                <DebounceSelect fetchOptions={fetchUserCategoryList} />
              </Form.Item>
            </Col>
            )}
            <Col span={4}>
              <Form.Item label={t('image')}>
                <MediaUpload
                  type='categories'
                  imageList={image}
                  setImageList={setImage}
                  form={form}
                  multiple={false}
                />
              </Form.Item>
            </Col>
          </Row>
          <Button type='primary' htmlType='submit' loading={loadingBtn}>
            {t('submit')}
          </Button>
        </Form>
      ) : (
        <div className='d-flex justify-content-center align-items-center py-5'>
          <Spin size='large' className='mt-5 pt-5' />
        </div>
      )}
    </Card>
    {!!categoryId && !state?.parentId && <SellerCategories type='sub_main' parentId={categoryId} />}
    </>
  );
};
export default SellerCategoryEdit;
